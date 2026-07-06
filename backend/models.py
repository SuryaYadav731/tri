from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ReceiverConfig(BaseModel):
    receiver_id: str
    name: str
    ip_address: str = "0.0.0.0"
    lat: float
    lon: float
    altitude: float = 0.0
    heading: float = 0.0
    port: int
    freq_range: str = "10 MHz - 6 GHz"
    status: str = "OFFLINE"
    description: str = ""

class DFStationReport(BaseModel):
    system_id: str
    lat: float
    lon: float
    freq: float
    doa: float
    true_bearing: Optional[float] = None
    signal_power: Optional[float] = None
    snr: Optional[float] = None
    timestamp: Optional[float] = None
    confidence_score: Optional[float] = None
    bandwidth: Optional[float] = 25000.0
    noise_floor: Optional[float] = -120.0
    signal_quality: Optional[float] = 85.0
    signal_duration: Optional[float] = 0.5
    modulation_type: Optional[str] = "FM"
    peak: Optional[float] = None
    signal_width: Optional[float] = None

class TargetTrack(BaseModel):
    track_id: str
    lat: float
    lon: float
    freq: float
    confidence: float
    error_radius: float = 0.0
    ellipse_a: float = 0.0
    ellipse_b: float = 0.0
    ellipse_angle: float = 0.0
    gdop: float = 0.0
    geometry_score: float = 0.0
    intersection_angle: float = 0.0
    detection_time: float = 0.0
    estimated_accuracy: float = 0.0
    classification: str
    threat_level: str = "Unknown"
    station_count: int
    speed: float = 0.0
    heading: float = 0.0
    detection_count: int = 1
    last_update: float = 0.0
    distances: Dict[str, float] = {} # receiver_id -> distance in km
    bearings: Dict[str, float] = {} # receiver_id -> bearing

class ReceiverHealth(BaseModel):
    receiver_id: str
    status: str
    packets_per_sec: float
    latency_ms: float
    dropped_packets: int
    last_packet_time: float
    bytes_received: int = 0
    last_json: str = ""
    reconnect_count: int = 0
    errors: int = 0
    client: str = "None"
    packets: int = 0
    cpu_usage: float = 0.0
    ram_usage: float = 0.0
    temperature: float = 0.0

class TimelineEvent(BaseModel):
    id: str
    timestamp: float
    type: str
    message: str
    severity: str = "info"

class FFTData(BaseModel):
    receiver_id: str
    frequency_start: float
    frequency_step: float
    data: List[float]
    timestamp: float

class SystemState(BaseModel):
    receivers: List[ReceiverConfig]
    reports: List[DFStationReport]
    targets: List[TargetTrack]
    health: List[ReceiverHealth] = []
    events: List[TimelineEvent] = []
    fft_data: Dict[str, FFTData] = {}
