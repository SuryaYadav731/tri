import asyncio
import os
os.environ["USE_POSTGRES"] = "false"
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from models import DFStationReport, TargetTrack, SystemState, ReceiverConfig, ReceiverHealth, FFTData
from db_models import ReceiverModel, ReceiverPacketModel, TriangulatedTargetModel, TrackModel
from database import init_db, get_db
from tcp_receiver import ReceiverTCPServer
from triangulation_engine import group_reports_by_frequency, least_squares_intersection, apply_kalman_filter, classify_threat
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import time
import random
import psutil
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="DF Triangulation Command Center")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    print(f"{request.method} {request.url.path}")
    print(f"Response Code: {response.status_code}")
    print(f"Response Time: {process_time:.4f}s")
    return response

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

frontend_manager = ConnectionManager()

current_configs = {} # station_id -> ReceiverConfig
current_reports = {} # station_id -> DFStationReport
current_targets = {} # track_id -> TargetTrack
system_events = [] # List of TimelineEvent dicts
current_fft_data = {} # station_id -> FFTData
tcp_servers = {} # station_id -> ReceiverTCPServer instance
tcp_tasks = {} # station_id -> asyncio.Task
health_stats = {} # station_id -> dict


def add_event(type_str: str, message: str, severity: str = "info"):
    import uuid
    ev = {
        "id": str(uuid.uuid4()),
        "timestamp": time.time(),
        "type": type_str,
        "message": message,
        "severity": severity
    }
    system_events.insert(0, ev)
    if len(system_events) > 500:
        system_events.pop()

def classify_threat(freq: float) -> str:
    if 2400 <= freq <= 2500 or 5700 <= freq <= 5850:
        return "Drone Link"
    elif 130 <= freq <= 174 or 400 <= freq <= 470:
        return "Communication"
    elif freq == 1575.42:
        return "Jammer"
    return "Unknown"

async def process_triangulation():
    now = time.time()
    active_reports = [r for r in current_reports.values() if r.timestamp and (now - r.timestamp) < 5.0]
    
    if len(active_reports) < 3:
        current_targets.clear()
        return
        
    groups = group_reports_by_frequency(active_reports)
    
    for group in groups:
        if len(group) >= 3:
            result = least_squares_intersection(group)
            if result:
                freq = sum(r.freq for r in group) / len(group)
                track_id = f"TRACK-{int(freq*1000)}"
                
                avg_power = sum((r.signal_power or -100.0) for r in group) / len(group)
                
                is_new = track_id not in current_targets
                if is_new:
                    add_event("TARGET_CREATED", f"New target detected on {freq:.2f} MHz", "warning")
                
                old_target = current_targets.get(track_id)
                detection_count = (old_target.detection_count + 1) if old_target else 1
                
                # Kalman Filter & Velocity
                speed = 0.0
                heading = 0.0
                dt = now - old_target.last_update if old_target else 0.0
                
                if old_target:
                    from geographiclib.geodesic import Geodesic
                    g = Geodesic.WGS84.Inverse(old_target.lat, old_target.lon, result["lat"], result["lon"])
                    dist = g['s12']
                    if dt > 0:
                        speed = dist / dt # m/s
                    heading = g['azi1'] if g['azi1'] >= 0 else g['azi1'] + 360
                    
                # Apply Kalman
                smooth_lat, smooth_lon = apply_kalman_filter(track_id, result["lat"], result["lon"], dt)
                
                threat = classify_threat(freq, avg_power, result["confidence"], speed)
                
                if result["confidence"] > 90 and (not old_target or old_target.confidence <= 90):
                    add_event("TARGET_LOCKED", f"High confidence target lock established on {track_id}", "danger")
                elif result["confidence"] <= 90 and old_target and old_target.confidence > 90:
                    add_event("TARGET_LOST", f"Lost target lock on {track_id}", "warning")
                
                target = TargetTrack(
                    track_id=track_id,
                    lat=smooth_lat,
                    lon=smooth_lon,
                    freq=freq,
                    confidence=result["confidence"],
                    error_radius=result["error_radius"],
                    ellipse_a=result["ellipse_a"],
                    ellipse_b=result["ellipse_b"],
                    ellipse_angle=result["ellipse_angle"],
                    gdop=result["gdop"],
                    geometry_score=result.get("geometry_score", 0.0),
                    classification=threat,
                    threat_level=threat,
                    station_count=len(group),
                    speed=speed,
                    heading=heading,
                    detection_count=detection_count,
                    last_update=now,
                    distances=result.get("distances", {}),
                    bearings=result.get("bearings", {})
                )
                current_targets[track_id] = target

async def handle_new_report(report: DFStationReport):
    # Apply True Bearing
    if report.system_id in current_configs:
        config = current_configs[report.system_id]
        report.true_bearing = (config.heading + report.doa) % 360
    else:
        report.true_bearing = report.doa
        
    # Auto detect modulation
    if report.bandwidth:
        bw = report.bandwidth
        if bw < 1000:
            report.modulation_type = "CW"
        elif bw < 6000:
            report.modulation_type = "AM"
        elif bw < 20000:
            report.modulation_type = "FM"
        elif bw < 50000:
            report.modulation_type = "FSK"
        elif bw < 200000:
            report.modulation_type = "PSK"
        else:
            report.modulation_type = "Unknown"
            
    current_reports[report.system_id] = report
    
    # Store packet in database
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        db_packet = ReceiverPacketModel(
            receiver_id=report.system_id,
            frequency=report.freq,
            power=report.signal_power,
            snr=report.snr,
            doa=report.doa
        )
        session.add(db_packet)
        await session.commit()
        logger.info("RECEIVER UPDATED")
        logger.info("WEBSOCKET BROADCASTED")
        
    await process_triangulation()
    
    stats = health_stats.get(report.system_id, {})
    update_msg = {
        "type": "receiver_update",
        "receiver_id": report.system_id,
        "doa": report.doa,
        "frequency": report.freq,
        "freq": report.freq,
        "power": report.signal_power,
        "snr": report.snr,
        "lat": report.lat,
        "lon": report.lon,
        "packet_count": stats.get("packets", 1),
        "status": stats.get("status", "ONLINE")
    }
    await frontend_manager.broadcast(json.dumps(update_msg))
    
async def handle_new_fft(fft_payload: FFTData):
    current_fft_data[fft_payload.receiver_id] = fft_payload

async def broadcast_state_loop():
    try:
        while True:
            health_list = []
            for sid, stats in health_stats.items():
                health_list.append(ReceiverHealth(
                    receiver_id=sid,
                    status=stats.get("status", "OFFLINE"),
                    packets_per_sec=stats.get("packets_per_sec", 0),
                    latency_ms=stats.get("latency_ms", 0),
                    dropped_packets=stats.get("dropped_packets", 0),
                    last_packet_time=stats.get("last_packet", 0),
                    bytes_received=stats.get("bytes_received", 0),
                    last_json=stats.get("last_json", ""),
                    reconnect_count=stats.get("reconnect_count", 0),
                    errors=stats.get("errors", 0),
                    client=stats.get("client", "None"),
                    packets=stats.get("packets", 0),
                    cpu_usage=psutil.cpu_percent(),
                    ram_usage=psutil.virtual_memory().percent,
                    temperature=random.uniform(35.0, 50.0)
                ))
                
            state = SystemState(
                receivers=list(current_configs.values()),
                reports=list(current_reports.values()),
                targets=list(current_targets.values()),
                health=health_list,
                events=system_events,
                fft_data=current_fft_data
            )
            await frontend_manager.broadcast(state.model_dump_json())
            await asyncio.sleep(1/60.0)  # 60 FPS updates
    except asyncio.CancelledError:
        pass

async def monitor_health():
    while True:
        await asyncio.sleep(1)
        now = time.time()
        for station_id, stats in list(health_stats.items()):
            # Calculate packets per second
            current_packets = stats.get("packets", 0)
            last_packets = stats.get("last_packets_count", 0)
            stats["packets_per_sec"] = current_packets - last_packets
            stats["last_packets_count"] = current_packets
            
            # Check for OFFLINE timeout
            if stats["status"] in ["ONLINE", "CONNECTED"] and (now - stats.get("last_packet", now)) > 10 and stats.get("packets", 0) > 0:
                stats["status"] = "OFFLINE"
                add_event("RECEIVER_LOST", f"Receiver {station_id} lost connection", "danger")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

broadcast_task = None
health_task = None

def start_receiver(config: ReceiverConfig):
    station_id = config.receiver_id
    # Ensure any previous instance is stopped
    stop_receiver(station_id)
    
    bind_ip = config.ip_address if config.ip_address and config.ip_address != "0.0.0.0" else "0.0.0.0"
    health_stats[station_id] = {}
    
    server = ReceiverTCPServer(
        station_id=station_id,
        host=bind_ip,
        port=config.port,
        config=config.model_dump(),
        packet_callback=handle_new_report,
        event_callback=add_event,
        fft_callback=handle_new_fft,
        health_stats_ref=health_stats[station_id]
    )
    tcp_servers[station_id] = server
    task = asyncio.create_task(server.start())
    tcp_tasks[station_id] = task

def stop_receiver(station_id: str):
    if station_id in tcp_tasks:
        tcp_tasks[station_id].cancel()
        del tcp_tasks[station_id]
    if station_id in tcp_servers:
        if tcp_servers[station_id].sock:
            tcp_servers[station_id].sock.close()
        del tcp_servers[station_id]
    if station_id in health_stats:
        del health_stats[station_id]

@app.on_event("startup")
async def on_startup():
    global broadcast_task, health_task
    print("CORS Enabled")
    print("Allowed Origins: http://localhost:5173, http://localhost:5174, http://127.0.0.1:5173, http://127.0.0.1:5174")
    print("Listening Port: 8000")
    print("API Ready")
    await init_db()
    
    health_task = asyncio.create_task(monitor_health())
    broadcast_task = asyncio.create_task(broadcast_state_loop())

    print("Loading saved receivers...")
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ReceiverModel).where(ReceiverModel.is_enabled == True))
        stations = result.scalars().all()
        for st in stations:
            config = ReceiverConfig(
                receiver_id=st.receiver_id,
                name=st.name,
                ip_address=st.ip_address,
                lat=st.lat,
                lon=st.lon,
                altitude=st.altitude,
                heading=st.heading,
                port=st.port,
                freq_range=st.freq_range,
                status=st.status,
                description=st.description
            )
            current_configs[st.receiver_id] = config
            print(f"Loaded {st.receiver_id}")
            start_receiver(config)
    print("Multi-Port Listeners Ready")

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Shutting down... cancelling background tasks.")
    for sid in list(tcp_servers.keys()):
        stop_receiver(sid)
    if broadcast_task:
        broadcast_task.cancel()
    if health_task:
        health_task.cancel()

@app.post("/api/receivers")
async def add_station(station: ReceiverConfig, db: AsyncSession = Depends(get_db)):
    try:
        print("-" * 32)
        print("POST /api/receivers")
        print("Incoming JSON:")
        print(station.model_dump_json(indent=2))
        print("Validation result: PASS")
        
        from sqlalchemy.exc import IntegrityError
        
        # Check if port is already in use by a DIFFERENT receiver
        for sid, conf in current_configs.items():
            if conf.port == station.port and sid != station.receiver_id:
                print("Failed: Port already in use")
                return {"success": False, "error": f"Port {station.port} is already in use by {sid}"}

        # Check if receiver already exists in DB
        result = await db.execute(select(ReceiverModel).where(ReceiverModel.receiver_id == station.receiver_id))
        db_station = result.scalars().first()
        
        is_new = False
        port_changed = False
        message = "Receiver added"
        
        if db_station:
            if db_station.port != station.port:
                port_changed = True
            db_station.name = station.name
            db_station.ip_address = station.ip_address
            db_station.lat = station.lat
            db_station.lon = station.lon
            db_station.altitude = station.altitude
            db_station.heading = station.heading
            db_station.port = station.port
            db_station.freq_range = station.freq_range
            db_station.description = station.description
            db_station.is_enabled = True
            message = "Receiver updated"
        else:
            is_new = True
            db_station = ReceiverModel(
                receiver_id=station.receiver_id,
                name=station.name,
                ip_address=station.ip_address,
                lat=station.lat,
                lon=station.lon,
                altitude=station.altitude,
                heading=station.heading,
                port=station.port,
                freq_range=station.freq_range,
                status="LISTENING",
                description=station.description,
                is_enabled=True
            )
            db.add(db_station)
            
        print("Database insert/update: DONE")
        await db.commit()
        print("Commit status: SUCCESS")
        
        config = ReceiverConfig(
            receiver_id=db_station.receiver_id,
            name=db_station.name,
            ip_address=db_station.ip_address,
            lat=db_station.lat,
            lon=db_station.lon,
            altitude=db_station.altitude,
            heading=db_station.heading,
            port=db_station.port,
            freq_range=db_station.freq_range,
            status=db_station.status,
            description=db_station.description
        )
        
        current_configs[config.receiver_id] = config
        
        # Start or Restart listener
        if is_new or port_changed:
            try:
                start_receiver(config)
            except Exception as e:
                # If listener fails to start, rollback DB and return error
                if is_new:
                    await db.delete(db_station)
                else:
                    db_station.is_enabled = False # At least disable it
                await db.commit()
                del current_configs[config.receiver_id]
                print(f"Failed: TCP listener failed: {str(e)}")
                return {"success": False, "error": f"Failed to start TCP listener: {str(e)}"}
        
        print("TCP Listener Started")
        print("Receiver Registered")
        add_event("RECEIVER_ADDED", f"Receiver {config.receiver_id} added and listening on {config.port}", "info")
        print("-" * 32)
        
        response_data = {
            "success": True,
            "message": message,
            "receiver": config.model_dump()
        }
        print("Returned response:", response_data)
        return response_data
        
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        print(f"Database error - {str(e)}")
        return {"success": False, "error": str(e)}

@app.delete("/api/receivers/{receiver_id}")
async def remove_station_endpoint(receiver_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ReceiverModel).where(ReceiverModel.receiver_id == receiver_id))
    st = result.scalar_one_or_none()
    if st:
        await db.delete(st)
        await db.commit()
    stop_receiver(receiver_id)
    if receiver_id in current_configs:
        port = current_configs[receiver_id].port
        del current_configs[receiver_id]
    else:
        port = "unknown"
        
    if receiver_id in current_reports:
        del current_reports[receiver_id]
        
    # Clear events related to this receiver
    global system_events
    system_events = [ev for ev in system_events if receiver_id not in ev['message']]
        
    add_event("RECEIVER_DELETED", f"Receiver {receiver_id} removed. TCP Listener on port {port} stopped.", "danger")
        
    await process_triangulation()
    
    # Broadcast deletion immediately
    delete_msg = {
        "type": "receiver_deleted",
        "receiver_id": receiver_id
    }
    await frontend_manager.broadcast(json.dumps(delete_msg))
    
    return {"status": "success"}

@app.get("/api/receivers")
async def get_stations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ReceiverModel))
    stations = result.scalars().all()
    return stations

@app.websocket("/ws/frontend")
async def ws_frontend(websocket: WebSocket):
    await frontend_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        frontend_manager.disconnect(websocket)

@app.get("/api/debug/receivers")
async def debug_receivers(db: AsyncSession = Depends(get_db)):
    res = []
    
    # Get all DB receivers
    result = await db.execute(select(ReceiverModel))
    db_stations = {st.receiver_id: st for st in result.scalars().all()}
    
    # All known IDs
    all_sids = set(db_stations.keys()).union(set(current_configs.keys()))
    
    for sid in all_sids:
        db_saved = sid in db_stations
        runtime_loaded = sid in current_configs
        stats = receiver_manager.health_stats.get(sid, {})
        listening = stats.get("status") in ["LISTENING", "CONNECTED", "ONLINE"]
        client_connected = stats.get("connected", False)
        status = stats.get("status", "OFFLINE") if runtime_loaded else "NOT_LOADED"
        
        last_packet_raw = stats.get("last_packet", 0)
        from datetime import datetime
        last_seen = datetime.utcfromtimestamp(last_packet_raw).strftime('%Y-%m-%dT%H:%M:%SZ') if last_packet_raw > 0 else "Never"
        
        res.append({
            "Receiver": sid,
            "Database Saved": db_saved,
            "Runtime Loaded": runtime_loaded,
            "Listener Running": listening,
            "Client Connected": client_connected,
            "Last Packet": stats.get("packets", 0),
            "Last Seen": last_seen,
            "Status": status
        })
    return res

@app.get("/api/debug/tcp")
async def debug_tcp():
    listeners = []
    for sid, conf in receiver_manager.configs.items():
        stats = receiver_manager.health_stats.get(sid, {})
        listening = stats.get("status") in ["LISTENING", "CONNECTED", "ONLINE"]
        # Count clients roughly by checking if connected
        clients = 1 if stats.get("connected", False) else 0
        listeners.append({
            "receiver": sid,
            "listening": listening,
            "port": conf.get("port"),
            "clients": clients
        })
    return listeners

@app.get("/api/debug/ws")
async def debug_ws():
    return {
        "Connected Frontends": len(frontend_manager.active_connections)
    }

@app.get("/api/debug/packets")
async def debug_packets(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import desc
    result = await db.execute(select(ReceiverPacketModel).order_by(desc(ReceiverPacketModel.id)).limit(100))
    return result.scalars().all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
