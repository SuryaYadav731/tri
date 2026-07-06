export interface ReceiverConfig {
    receiver_id: string;
    name: string;
    ip_address?: string;
    lat: number;
    lon: number;
    altitude: number;
    heading: number;
    port: number;
    freq_range: string;
    status: string;
    description: string;
}

export interface DFStationReport {
    system_id: string;
    lat: number;
    lon: number;
    freq: number;
    doa: number;
    true_bearing?: number;
    signal_power?: number;
    snr?: number;
    timestamp?: number;
    confidence_score?: number;
    bandwidth?: number;
    noise_floor?: number;
    signal_quality?: number;
    signal_duration?: number;
    modulation_type?: string;
    peak?: number;
    signal_width?: number;
}

export interface TargetTrack {
    track_id: string;
    lat: number;
    lon: number;
    freq: number;
    confidence: number;
    error_radius: number;
    ellipse_a: number;
    ellipse_b: number;
    ellipse_angle: number;
    gdop: number;
    geometry_score: number;
    intersection_angle: number;
    detection_time: number;
    estimated_accuracy: number;
    classification: string;
    threat_level: string;
    station_count: number;
    speed: number;
    heading: number;
    detection_count: number;
    last_update: number;
    distances: Record<string, number>;
    bearings: Record<string, number>;
}

export interface ReceiverHealth {
    receiver_id: string;
    status: string;
    packets_per_sec: number;
    latency_ms: number;
    dropped_packets: number;
    last_packet_time: number;
    bytes_received: number;
    last_json: string;
    reconnect_count: number;
    errors: number;
    client: string;
    packets: number;
    cpu_usage: number;
    ram_usage: number;
    temperature: number;
}

export interface MapOverlays {
    showReceivers: boolean;
    showBearings: boolean;
    showTargets: boolean;
    showConfidence: boolean;
    showErrorRadius: boolean;
    showSpectrumActivity: boolean;
    showHeatmap: boolean;
    showThreats: boolean;
    bearingLineLengthKm: number;
}

export interface TimelineEvent {
    id: string;
    timestamp: number;
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'danger' | 'success';
}

export interface FFTData {
    frequency_start: number;
    frequency_step: number;
    data: number[];
    timestamp: number;
}

export interface SystemState {
    receivers: ReceiverConfig[];
    reports: DFStationReport[];
    targets: TargetTrack[];
    health: ReceiverHealth[];
    events: TimelineEvent[];
    fft_data?: Record<string, FFTData>;
}
