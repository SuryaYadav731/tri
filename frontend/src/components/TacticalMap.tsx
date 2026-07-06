import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers } from 'lucide-react';
import type { TargetTrack, DFStationReport, ReceiverConfig } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useSystemStore } from '../store/useSystemStore';
import { HeatmapLayer } from './HeatmapLayer';

const createStationIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-icon bg-transparent',
        html: `<div style="color: ${color}; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: rgba(0,0,0,0.5); border: 1px solid ${color}; border-radius: 4px;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"/>
            </svg>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const createTargetIcon = (color: string, isLocked: boolean) => {
    return L.divIcon({
        className: 'custom-icon bg-transparent',
        html: `<div style="color: ${color}; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 2px solid ${color}; transform: rotate(45deg); background: rgba(255,0,0,0.2);" class="${isLocked ? 'marker-pulse-fast' : 'marker-pulse'}">
            <div style="width: 4px; height: 4px; background-color: ${color};"></div>
            ${isLocked ? `<div style="position: absolute; width: 10px; height: 10px; border: 1px solid ${color}; transform: rotate(45deg);"></div>` : ''}
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const getEndPoint = (lat: number, lon: number, bearing: number, distanceKm: number = 50) => {
    const R = 6371;
    const brng = bearing * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceKm / R) +
        Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distanceKm / R) * Math.cos(lat1),
        Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2));
    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI] as [number, number];
};

interface Props {
    receivers: ReceiverConfig[];
    reports: DFStationReport[];
    targets: TargetTrack[];
    targetHistory?: Record<string, [number, number][]>;
}

export const TacticalMap: React.FC<Props> = ({ receivers, reports, targets, targetHistory = {} }) => {
    const { theme } = useTheme();
    const { overlays, updateOverlays, health } = useSystemStore();
    
    // Switch tile URLs based on theme
    const tileUrl = theme === 'dark' 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
        
    const bearingColor = theme === 'dark' ? '#00FF88' : '#0066CC';

    const getStatusColor = (status: string) => {
        if (status === 'ONLINE' || status === 'CONNECTED') return theme === 'dark' ? '#00FF88' : '#008A5A';
        if (status === 'LISTENING') return theme === 'dark' ? '#0088FF' : '#0066CC';
        if (status === 'OFFLINE') return theme === 'dark' ? '#FF4D4D' : '#DC2626';
        return theme === 'dark' ? '#AAAAAA' : '#888888';
    };

    // Prepare heatmap points from target history to create fading tails
    const heatmapPoints: [number, number, number][] = [];
    if (overlays.showHeatmap) {
        targets.forEach(t => {
            const history = targetHistory[t.track_id] || [];
            // Last 30 positions, older positions have lower intensity
            history.slice(-30).forEach((pt, i, arr) => {
                heatmapPoints.push([pt[0], pt[1], (i + 1) / arr.length]);
            });
        });
    }

    return (
        <div className="h-full w-full bg-tactical-bg relative z-0 flex">
            {/* Map Layers Toggle */}
            <div className="absolute top-4 right-4 z-[400] bg-tactical-card border border-tactical-border p-3 flex flex-col gap-2 shadow-xl w-48">
                <div className="flex items-center gap-2 mb-1 border-b border-tactical-border pb-2 text-xs font-bold text-tactical-textMuted tracking-widest">
                    <Layers size={14}/> MAP OVERLAYS
                </div>
                {Object.keys(overlays).filter(k => k !== 'bearingLineLengthKm').map(key => (
                    <label key={key} className="flex items-center gap-2 text-[10px] uppercase font-bold text-tactical-text cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={(overlays as any)[key]} 
                            onChange={() => updateOverlays({ [key]: !(overlays as any)[key] })} 
                            className="accent-tactical-primary" 
                        />
                        {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                ))}
                <div className="mt-2 pt-2 border-t border-tactical-border">
                    <label className="flex flex-col gap-1 text-[10px] uppercase font-bold text-tactical-text">
                        BEARING LENGTH (KM)
                        <select 
                            className="bg-tactical-bg border border-tactical-border p-1 text-tactical-text rounded outline-none w-full"
                            value={overlays.bearingLineLengthKm}
                            onChange={(e) => updateOverlays({ bearingLineLengthKm: Number(e.target.value) })}
                        >
                            <option value={10}>10 km</option>
                            <option value={25}>25 km</option>
                            <option value={50}>50 km</option>
                            <option value={100}>100 km</option>
                            <option value={200}>200 km</option>
                        </select>
                    </label>
                </div>
            </div>

            <MapContainer 
                center={[28.45, 77.2]} 
                zoom={10} 
                style={{ height: '100%', width: '100%', backgroundColor: 'transparent' }}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer url={tileUrl} />
                
                {overlays.showHeatmap && heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}

                {overlays.showReceivers && receivers.map(st => {
                    const h = health?.find(x => x.receiver_id === st.receiver_id);
                    const rep = reports?.find(r => r.system_id === st.receiver_id);
                    
                    const currentStatus = h?.status || st.status || 'CONFIGURED';
                    const color = getStatusColor(currentStatus);
                    const lastSeen = h?.last_packet_time ? new Date(h.last_packet_time * 1000).toLocaleTimeString() : 'N/A';

                    return (
                        <React.Fragment key={st.receiver_id}>
                            <Marker position={[st.lat, st.lon]} icon={createStationIcon(color)}>
                                <Popup className="tactical-popup">
                                    <div className="font-mono text-xs space-y-1">
                                        <b style={{ color }}>{st.name || st.receiver_id}</b>
                                        <div className="text-[10px] text-tactical-textMuted">{st.receiver_id}</div>
                                        <div className="border-t border-tactical-border my-1 pt-1"></div>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                            <span>IP:</span> <span>0.0.0.0</span>
                                            <span>Port:</span> <span>{st.port}</span>
                                            <span>DOA:</span> <span>{rep ? `${rep.doa.toFixed(1)}°` : 'N/A'}</span>
                                            <span>Freq:</span> <span>{rep ? `${rep.freq.toFixed(3)} MHz` : 'N/A'}</span>
                                            <span>Power:</span> <span>{rep ? `${rep.signal_power?.toFixed(1)} dBm` : 'N/A'}</span>
                                            <span>SNR:</span> <span>{rep ? `${rep.snr?.toFixed(1)} dB` : 'N/A'}</span>
                                            <span>Seen:</span> <span>{lastSeen}</span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}

                {overlays.showBearings && reports.map(r => {
                    const st = receivers.find(rec => rec.receiver_id === r.system_id);
                    if (!st) return null;
                    const trueBearing = r.true_bearing ?? r.doa;
                    
                    // Check if this report's frequency is associated with a locked target
                    const associatedTarget = targets.find(t => Math.abs(t.freq - r.freq) < 0.05);
                    const isLocked = associatedTarget ? associatedTarget.confidence > 90 : false;
                    
                    const endPt = getEndPoint(st.lat, st.lon, trueBearing, overlays.bearingLineLengthKm || 50);
                    return (
                        <Polyline 
                            key={`brg-${r.system_id}`}
                            positions={[[st.lat, st.lon], endPt]} 
                            color={isLocked ? '#FF4D4D' : bearingColor} 
                            weight={isLocked ? 3 : 2} 
                            opacity={theme === 'dark' ? 0.9 : 0.6} 
                            dashArray={isLocked ? undefined : "4, 8"}
                            className="marker-pulse"
                        >
                            <Tooltip sticky direction="center" className="bg-tactical-bg text-tactical-text border-tactical-border text-xs font-mono font-bold">
                                {r.system_id}<br/>
                                DOA: {r.doa.toFixed(1)}°<br/>
                                Brg: {trueBearing.toFixed(1)}°<br/>
                                {r.freq.toFixed(3)} MHz
                            </Tooltip>
                        </Polyline>
                    );
                })}

                {targets.map(target => {
                    const isLocked = target.confidence > 90;
                    const color = theme === 'dark' ? '#FF4D4D' : '#DC2626';
                    const historyPts = targetHistory[target.track_id] || [];
                    return (
                        <React.Fragment key={target.track_id}>
                            {overlays.showTargets && (
                                <Marker position={[target.lat, target.lon]} icon={createTargetIcon(color, isLocked)}>
                                    <Popup className="tactical-popup">
                                        <div className="font-mono text-xs text-tactical-text">
                                            <b className="text-tactical-danger">{target.track_id}</b><br/>
                                            <span className="text-[10px] text-tactical-textMuted tracking-widest">{target.classification}</span><br/>
                                            <div className="mt-2 border-t border-tactical-border pt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                                                <span>Lat:</span> <span>{target.lat.toFixed(4)}</span>
                                                <span>Lon:</span> <span>{target.lon.toFixed(4)}</span>
                                                <span>Freq:</span> <span>{target.freq.toFixed(3)} MHz</span>
                                                <span>Conf:</span> <span style={{color: target.confidence > 90 ? '#00FF00' : target.confidence > 50 ? '#FFFF00' : '#FF0000'}}>{target.confidence.toFixed(1)}%</span>
                                                <span>Stations:</span> <span>{target.station_count || 3}</span>
                                                <span>Speed:</span> <span>{(target.speed || 0).toFixed(1)} m/s</span>
                                                <span>Heading:</span> <span>{(target.heading || 0).toFixed(1)}°</span>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                            
                            {overlays.showTargets && historyPts.length > 1 && (
                                <Polyline 
                                    positions={historyPts} 
                                    color={color} 
                                    weight={2} 
                                    opacity={0.5} 
                                    dashArray="4, 4"
                                />
                            )}
                            
                            {overlays.showErrorRadius && (
                                <Circle 
                                    center={[target.lat, target.lon]} 
                                    pathOptions={{ 
                                        color: color, 
                                        fillColor: color, 
                                        fillOpacity: 0.15,
                                        weight: 1,
                                        dashArray: "4, 6"
                                    }} 
                                    radius={target.error_radius || 5000 * (100 - target.confidence) / 100}
                                    className="marker-pulse"
                                />
                            )}
                            
                            {/* Confidence contours */}
                            {overlays.showConfidence && target.error_radius && (
                                <>
                                    <Circle center={[target.lat, target.lon]} pathOptions={{ color: '#FF8800', weight: 1, dashArray: "2, 4", fill: false }} radius={target.error_radius * 1.5} />
                                    <Circle center={[target.lat, target.lon]} pathOptions={{ color: '#FFFF00', weight: 1, dashArray: "2, 4", fill: false }} radius={target.error_radius * 2.0} />
                                </>
                            )}
                        </React.Fragment>
                    )
                })}
            </MapContainer>
        </div>
    );
};

