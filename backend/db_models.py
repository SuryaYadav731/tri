from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class ReceiverModel(Base):
    __tablename__ = 'receivers'
    id = Column(Integer, primary_key=True, index=True)
    receiver_id = Column(String, unique=True, index=True)
    name = Column(String)
    ip_address = Column(String, default="0.0.0.0")
    lat = Column(Float)
    lon = Column(Float)
    altitude = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    port = Column(Integer)
    freq_range = Column(String)
    status = Column(String, default="OFFLINE")
    description = Column(String)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_seen = Column(DateTime, nullable=True)

class ReceiverPacketModel(Base):
    __tablename__ = 'receiver_packets'
    id = Column(Integer, primary_key=True, index=True)
    receiver_id = Column(String, index=True)
    frequency = Column(Float)
    doa = Column(Float)
    power = Column(Float)
    snr = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class BearingModel(Base):
    __tablename__ = 'bearings'
    id = Column(Integer, primary_key=True, index=True)
    receiver_id = Column(String, index=True)
    doa = Column(Float)
    true_bearing = Column(Float)
    frequency = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class TriangulatedTargetModel(Base):
    __tablename__ = 'triangulated_targets'
    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(String, unique=True, index=True)
    lat = Column(Float)
    lon = Column(Float)
    frequency = Column(Float)
    confidence = Column(Float)
    error_radius = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class TrackModel(Base):
    __tablename__ = 'tracks'
    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(String, unique=True, index=True)
    lat = Column(Float)
    lon = Column(Float)
    frequency = Column(Float)
    confidence = Column(Float)
    threat_level = Column(String)
    receivers_used = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_update = Column(DateTime, default=datetime.utcnow)

class EventModel(Base):
    __tablename__ = 'events'
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String)
    description = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ThreatModel(Base):
    __tablename__ = 'threats'
    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(String, index=True)
    classification = Column(String)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReceiverHealthModel(Base):
    __tablename__ = 'receiver_health'
    id = Column(Integer, primary_key=True, index=True)
    receiver_id = Column(String, index=True)
    connection_status = Column(String)
    packets_per_sec = Column(Float)
    latency_ms = Column(Float)
    dropped_packets = Column(Integer)
    cpu_usage = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class SystemLogModel(Base):
    __tablename__ = 'system_logs'
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String)
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
