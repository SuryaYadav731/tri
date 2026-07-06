import asyncio
import socket
import json
import logging
from typing import Dict, Callable, Any
from models import DFStationReport, FFTData
from datetime import datetime
import time
import base64
import numpy as np

logger = logging.getLogger(__name__)

class ReceiverTCPServer:
    def __init__(self, station_id: str, host: str, port: int, config: dict, packet_callback: Callable, event_callback: Callable, fft_callback: Callable, health_stats_ref: dict):
        self.station_id = station_id
        self.host = host
        self.port = port
        self.config = config
        self.packet_callback = packet_callback
        self.event_callback = event_callback
        self.fft_callback = fft_callback
        self.health_stats = health_stats_ref
        self.server_task = None
        self.sock = None

    async def start(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.setblocking(False)
        try:
            self.sock.bind((self.host, self.port))
            self.sock.listen()
            print(f"Receiver {self.station_id} Registered\nListening\n{self.host}:{self.port}")
            logger.info(f"Started TCP listener for {self.station_id} on {self.host}:{self.port}")
            
            self.health_stats.update({
                "status": "LISTENING",
                "connected_at": 0,
                "packets": 0,
                "last_packets_count": 0,
                "packets_per_sec": 0,
                "last_packet": 0,
                "latency_ms": 0,
                "dropped_packets": 0,
                "bytes_received": 0,
                "last_json": "",
                "reconnect_count": 0,
                "errors": 0,
                "client": "None",
                "connected": False
            })
            
            loop = asyncio.get_running_loop()
            while True:
                client_sock, addr = await loop.sock_accept(self.sock)
                client_sock.setblocking(False)
                asyncio.create_task(self.handle_client(client_sock, addr))
                
        except OSError as e:
            if e.errno in (98, 10048):
                logger.error("PORT NOT BOUND")
            logger.error(f"Failed to start TCP server for {self.station_id} on port {self.port}: {e}")
            self.health_stats["status"] = "OFFLINE"
            self.health_stats["errors"] = self.health_stats.get("errors", 0) + 1
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Failed to start TCP server for {self.station_id} on port {self.port}: {e}")
        finally:
            if self.sock:
                self.sock.close()
            logger.info(f"TCP server for {self.station_id} on port {self.port} stopped.")

    async def handle_client(self, client_sock: socket.socket, addr):
        client_ip, client_port = addr
        
        print(f"[{self.port}]\nClient Connected\nReceiver {self.station_id}")
        logger.info("Client Connected")
        if self.event_callback:
            self.event_callback("TCP_CONNECTED", f"Client {client_ip}:{client_port} connected to {self.station_id}", "success")
        
        reconnects = self.health_stats.get("reconnect_count", 0)
        if self.health_stats.get("connected"):
            reconnects += 1
            
        self.health_stats.update({
            "status": "CONNECTED",
            "connected_at": time.time(),
            "client": client_ip,
            "connected": True,
            "reconnect_count": reconnects
        })
        
        buffer = b""
        try:
            loop = asyncio.get_running_loop()
            while True:
                data = await loop.sock_recv(client_sock, 4096)
                if not data:
                    break
                
                self.health_stats["bytes_received"] = self.health_stats.get("bytes_received", 0) + len(data)
                buffer += data
                
                while b"\n" in buffer:
                    line, buffer = buffer.split(b"\n", 1)
                    raw_str = line.decode().strip()
                    if not raw_str:
                        continue
                    
                    try:
                        payload = json.loads(raw_str)
                        packet_num = self.health_stats.get("packets", 0) + 1
                        
                        print(f"[{self.port}]\nPacket Received\nDOA {payload.get('doa', 0.0)}°")
                        logger.info("Packet Received")
                        
                        report = DFStationReport(
                            system_id=self.station_id,  # FORCE bind to configured listener
                            lat=self.config.get("lat", 0.0),
                            lon=self.config.get("lon", 0.0),
                            freq=payload.get("freq", 0.0),
                            doa=payload.get("doa", 0.0),
                            signal_power=payload.get("power", -100.0),
                            snr=payload.get("snr", 0.0),
                            timestamp=datetime.utcnow().timestamp(),
                            confidence_score=payload.get("confidence", 90.0)
                        )
                        logger.info("PACKET PARSED")
                        
                        self.health_stats["packets"] = packet_num
                        self.health_stats["last_packet"] = time.time()
                        self.health_stats["last_json"] = raw_str
                        self.health_stats["status"] = "ONLINE"
                        
                        iq_b64 = payload.get("iq_data")
                        if iq_b64 and self.fft_callback:
                            try:
                                iq_bytes = base64.b64decode(iq_b64)
                                iq_array = np.frombuffer(iq_bytes, dtype=np.float32)
                                complex_iq = iq_array[0::2] + 1j * iq_array[1::2]
                                
                                window = np.hanning(len(complex_iq))
                                windowed_iq = complex_iq * window
                                
                                fft_res = np.fft.fftshift(np.fft.fft(windowed_iq))
                                mag = 20 * np.log10(np.abs(fft_res) + 1e-12) - 30 
                                
                                center_freq = payload.get("freq", 433.0)
                                bw = payload.get("bw", 2.0)
                                
                                fft_payload = FFTData(
                                    receiver_id=self.station_id,
                                    frequency_start=center_freq - bw/2,
                                    frequency_step=bw / len(mag),
                                    data=mag.tolist(),
                                    timestamp=time.time()
                                )
                                
                                if asyncio.iscoroutinefunction(self.fft_callback):
                                    await self.fft_callback(fft_payload)
                                else:
                                    self.fft_callback(fft_payload)
                            except Exception as e:
                                logger.error(f"IQ parsing/FFT failed: {e}")
                        
                        if asyncio.iscoroutinefunction(self.packet_callback):
                            await self.packet_callback(report)
                        else:
                            self.packet_callback(report)
                            
                    except json.JSONDecodeError:
                        self.health_stats["errors"] = self.health_stats.get("errors", 0) + 1
                        logger.error("PACKET PARSE FAILED")
                        logger.warning(f"Invalid JSON on {self.station_id}")
                    
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.health_stats["errors"] = self.health_stats.get("errors", 0) + 1
            logger.error(f"Error on {self.station_id}: {e}")
        finally:
            logger.info(f"Connection closed on {self.station_id} from {addr}")
            if self.event_callback:
                self.event_callback("TCP_LOST", f"Client {addr[0]}:{addr[1]} disconnected from {self.station_id}", "danger")
            client_sock.close()
            self.health_stats["status"] = "OFFLINE"
            self.health_stats["connected"] = False
            self.health_stats["client"] = "None"
