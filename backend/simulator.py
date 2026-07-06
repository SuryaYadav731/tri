import asyncio
import time
import random
import math
from geographiclib.geodesic import Geodesic
import json
import httpx

STATIONS = [
    {"receiver_id": "DF001", "name": "ALPHA", "lat": 28.467700, "lon": 77.081500, "heading": 0, "port": 5001},
    {"receiver_id": "DF002", "name": "BRAVO", "lat": 28.535500, "lon": 77.391000, "heading": 0, "port": 5002},
    {"receiver_id": "DF003", "name": "CHARLIE", "lat": 28.408900, "lon": 77.317800, "heading": 0, "port": 5003}
]

TARGET = {"lat": 28.487121, "lon": 77.212432}

def get_bearing(lat1, lon1, lat2, lon2):
    geod = Geodesic.WGS84
    g = geod.Inverse(lat1, lon1, lat2, lon2)
    azi = g['azi1']
    if azi < 0:
        azi += 360
    return azi

async def register_stations():
    async with httpx.AsyncClient() as client:
        for st in STATIONS:
            try:
                # Assuming the backend will handle duplicates gracefully or we just post it
                await client.post("http://localhost:8000/api/receivers/connect", json=st)
                print(f"Registered station {st['receiver_id']} on port {st['port']}")
            except Exception as e:
                print(f"Failed to register {st['receiver_id']}: {e}")

async def send_data(st):
    while True:
        try:
            reader, writer = await asyncio.open_connection('127.0.0.1', st['port'])
            print(f"Connected to {st['receiver_id']} on port {st['port']}")
            
            while True:
                TARGET['lat'] += random.uniform(-0.0001, 0.0001)
                TARGET['lon'] += random.uniform(-0.0001, 0.0001)
                
                true_bearing = get_bearing(st['lat'], st['lon'], TARGET['lat'], TARGET['lon'])
                noisy_bearing = (true_bearing + random.uniform(-1, 1)) % 360
                
                from datetime import datetime
                import numpy as np
                import base64
                
                # Generate synthetic IQ data
                t = np.linspace(0, 1, 1024, endpoint=False)
                # target signal
                iq = np.exp(1j * 2 * np.pi * 10 * t) * (10**(TARGET.get('power', -50) / 20))
                # noise
                iq += (np.random.randn(1024) + 1j * np.random.randn(1024)) * 0.01
                
                iq_bytes = iq.astype(np.complex64).tobytes()
                iq_b64 = base64.b64encode(iq_bytes).decode('ascii')
                
                report = {
                    "system_id": st['receiver_id'],
                    "id": random.randint(100000, 999999),
                    "status": "UPDATE",
                    "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "freq": 433.0,
                    "bw": 2.0,
                    "power": round(random.uniform(-90, -50), 1),
                    "snr": round(random.uniform(5, 25), 1),
                    "doa": round(noisy_bearing, 2),
                    "lat": st['lat'],
                    "lon": st['lon'],
                    "confidence": round(random.uniform(80, 99), 1),
                    "iq_data": iq_b64
                }
                
                writer.write((json.dumps(report) + '\n').encode())
                await writer.drain()
                await asyncio.sleep(1)
        except Exception as e:
            print(f"Connection to {st['receiver_id']} failed: {e}. Retrying in 2 seconds...")
            await asyncio.sleep(2)

async def main():
    await register_stations()
    # allow time for server to start listening
    await asyncio.sleep(1)
    
    tasks = [asyncio.create_task(send_data(st)) for st in STATIONS]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
