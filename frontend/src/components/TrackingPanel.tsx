import React, { useState } from 'react';
import { Crosshair, Radio, ShieldAlert, Navigation, Server, Wifi, Clock, Activity, Trash2 } from 'lucide-react';
import { useSystemStore } from '../store/useSystemStore';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import type { ReceiverConfig } from '../types';

interface Props {
    onDeleteStation?: (stationId: string) => void;
}

export const TrackingPanel: React.FC<Props> = ({ onDeleteStation }) => {
    const { targets, receivers, health, reports } = useSystemStore();
    const [activeTab, setActiveTab] = useState<'tracks' | 'receivers' | 'tcp'>('receivers');
    const [sortBy, setSortBy] = useState<'threat' | 'distance' | 'freq'>('threat');
    const [deletingReceiver, setDeletingReceiver] = useState<ReceiverConfig | null>(null);

    const sortedTargets = [...targets].sort((a, b) => {
        if (sortBy === 'threat') return b.confidence - a.confidence;
        if (sortBy === 'freq') return b.freq - a.freq;
        return 0;
    });

    const isReceivingData = health.some(h => h.status === 'ONLINE');

    return (
        <div className="h-full bg-tactical-card border-l border-tactical-border flex flex-col z-10 w-full overflow-hidden">
            {/* Global Status */}
            <div className="bg-tactical-bg p-2 flex justify-between items-center border-b border-tactical-border shrink-0">
                <span className="text-xs font-bold text-tactical-textMuted tracking-widest">SYSTEM STATUS</span>
                <div className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold border ${isReceivingData ? 'bg-tactical-success/20 text-tactical-success border-tactical-success/50' : 'bg-tactical-danger/20 text-tactical-danger border-tactical-danger/50'}`}>
                    <div className={`w-2 h-2 rounded-full ${isReceivingData ? 'bg-tactical-success marker-pulse' : 'bg-tactical-danger'}`}></div>
                    DATA RECEIVING
                </div>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-tactical-border shrink-0">
                <button 
                    className={`flex-1 p-2 text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 ${activeTab === 'tracks' ? 'bg-tactical-primary/10 text-tactical-primary border-b-2 border-tactical-primary' : 'text-tactical-textMuted hover:bg-tactical-bg'}`}
                    onClick={() => setActiveTab('tracks')}
                >
                    <Navigation size={12} /> ACTIVE TRACKS
                </button>
                <button 
                    className={`flex-1 p-2 text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 ${activeTab === 'receivers' ? 'bg-tactical-primary/10 text-tactical-primary border-b-2 border-tactical-primary' : 'text-tactical-textMuted hover:bg-tactical-bg'}`}
                    onClick={() => setActiveTab('receivers')}
                >
                    <Server size={12} /> LIVE DATA
                </button>
                <button 
                    className={`flex-1 p-2 text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 ${activeTab === 'tcp' ? 'bg-tactical-primary/10 text-tactical-primary border-b-2 border-tactical-primary' : 'text-tactical-textMuted hover:bg-tactical-bg'}`}
                    onClick={() => setActiveTab('tcp')}
                >
                    <Activity size={12} /> TCP DEBUG
                </button>
            </div>

            {activeTab === 'tracks' && (
                <>
                    <div className="p-2 border-b border-tactical-border flex justify-between items-center bg-tactical-bg/50 shrink-0">
                        <span className="text-[10px] font-bold text-tactical-textMuted">SORT BY:</span>
                        <select 
                            className="bg-tactical-bg text-tactical-text border border-tactical-border rounded text-[10px] p-1 font-bold outline-none"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                        >
                            <option value="threat">THREAT LEVEL</option>
                            <option value="freq">FREQUENCY</option>
                        </select>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {sortedTargets.map(target => (
                            <div key={target.track_id} className="bg-tactical-bg p-3 rounded border border-tactical-border border-l-4 border-l-tactical-danger hover:border-tactical-primary transition-colors cursor-pointer shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-tactical-danger text-xs flex items-center gap-1">
                                        <Crosshair size={12} />
                                        {target.track_id}
                                    </span>
                                    <span className="text-[9px] bg-tactical-danger/10 text-tactical-danger px-1.5 py-0.5 rounded border border-tactical-danger/20 font-bold tracking-wider">
                                        {target.classification.toUpperCase()}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 text-[10px] text-tactical-text font-bold">
                                    <div>
                                        <span className="text-tactical-textMuted text-[9px] block">LATITUDE</span>
                                        {target.lat.toFixed(5)}
                                    </div>
                                    <div>
                                        <span className="text-tactical-textMuted text-[9px] block">LONGITUDE</span>
                                        {target.lon.toFixed(5)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-tactical-border/50">
                                    <div className="flex items-center gap-1 text-tactical-secondary">
                                        <Radio size={12} />
                                        <span className="font-mono font-bold">{target.freq.toFixed(3)} MHz</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-tactical-warning">
                                        <ShieldAlert size={12} />
                                        <span className="font-bold">{target.confidence.toFixed(1)}% ({target.station_count || 3} stns)</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {targets.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-tactical-textMuted opacity-50 pt-10">
                                <Navigation size={32} className="mb-2" />
                                <p className="text-xs font-bold tracking-wider">NO ACTIVE TRACKS</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'receivers' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {receivers.map(rec => {
                        const h = health.find(x => x.receiver_id === rec.receiver_id);
                        const r = reports.find(x => x.system_id === rec.receiver_id);
                        const isOnline = h?.status === 'ONLINE';
                        const statusColor = isOnline ? 'text-tactical-success' : 'text-tactical-danger';
                        const statusBg = isOnline ? 'bg-tactical-success/10 border-tactical-success/30' : 'bg-tactical-danger/10 border-tactical-danger/30';
                        
                        return (
                            <div key={rec.receiver_id} className={`bg-tactical-bg p-3 rounded border border-tactical-border hover:border-tactical-primary transition-colors cursor-pointer shadow-sm`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-tactical-text text-xs flex items-center gap-1">
                                        <Server size={12} className="text-tactical-primary" />
                                        {rec.receiver_id}
                                    </span>
                                    <div className="flex gap-2 items-center">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold tracking-wider flex items-center gap-1 ${statusColor} ${statusBg}`}>
                                            <Wifi size={10} /> {h?.status || rec.status}
                                        </span>
                                        <button 
                                            className="text-tactical-textMuted hover:text-tactical-danger transition-colors p-1"
                                            onClick={(e) => { e.stopPropagation(); setDeletingReceiver(rec); }}
                                            title="Delete Receiver"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-x-2 gap-y-2 mb-3 text-[10px] text-tactical-text font-bold">
                                    <div>
                                        <span className="text-tactical-textMuted text-[9px] block">DOA / BEARING</span>
                                        {r ? `${r.doa.toFixed(1)}° / ${r.true_bearing?.toFixed(1)}°` : '---'}
                                    </div>
                                    <div>
                                        <span className="text-tactical-textMuted text-[9px] block">FREQUENCY</span>
                                        {r ? `${r.freq.toFixed(3)} MHz` : '---'}
                                    </div>
                                    <div>
                                        <span className="text-tactical-textMuted text-[9px] block">POWER / SNR</span>
                                        {r ? `${r.signal_power?.toFixed(1)} dBm / ${r.snr?.toFixed(1)} dB` : '---'}
                                    </div>
                                    <div>
                                        <span className="text-tactical-textMuted text-[9px] block">PKTS/SEC</span>
                                        {h ? `${h.packets_per_sec.toFixed(1)}` : '0'}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[9px] pt-2 border-t border-tactical-border/50 text-tactical-textMuted font-bold">
                                    <div className="flex items-center gap-1">
                                        <Activity size={10} /> Latency: {h ? h.latency_ms.toFixed(1) : '0'}ms
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={10} /> Last: {h && h.last_packet_time > 0 ? `${Math.max(0, (Date.now()/1000) - h.last_packet_time).toFixed(1)}s ago` : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {receivers.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-tactical-textMuted opacity-50 pt-10">
                            <Server size={32} className="mb-2" />
                            <p className="text-xs font-bold tracking-wider">NO RECEIVERS ADDED</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'tcp' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {receivers.map(rec => {
                        const h = health.find(x => x.receiver_id === rec.receiver_id);
                        const isOnline = h?.status === 'ONLINE';
                        const statusColor = isOnline ? 'text-tactical-success' : 'text-tactical-danger';
                        const timeAgo = h && h.last_packet_time > 0 ? `${Math.max(0, (Date.now()/1000) - h.last_packet_time).toFixed(1)}s ago` : 'Never';

                        return (
                            <div key={`tcp-${rec.receiver_id}`} className="bg-tactical-bg p-3 rounded border border-tactical-border shadow-sm text-tactical-text font-mono text-[10px] font-bold">
                                <div className="flex justify-between items-center mb-2 border-b border-tactical-border pb-1">
                                    <span className="text-tactical-primary flex items-center gap-1"><Server size={12}/> {rec.receiver_id}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={statusColor}>{h?.status || 'OFFLINE'}</span>
                                        <button 
                                            className="text-tactical-textMuted hover:text-tactical-danger transition-colors"
                                            onClick={(e) => { e.stopPropagation(); setDeletingReceiver(rec); }}
                                            title="Delete Receiver"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                                    <div><span className="text-tactical-textMuted block text-[9px]">LISTENING IP</span> {rec.ip_address || "0.0.0.0"}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">LISTENING PORT</span> {rec.port}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">CLIENT IP</span> {h ? h.client || "None" : "None"}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">SOCKET STATE</span> {h?.status || 'OFFLINE'}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">BYTES RECEIVED</span> {h ? h.bytes_received : 0}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">PACKET COUNT</span> {h ? h.packets || 0 : 0}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">PACKET RATE</span> {h ? h.packets_per_sec : 0} /s</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">LAST PACKET</span> {timeAgo}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">RECONNECT COUNT</span> {h ? h.reconnect_count : 0}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">ERRORS</span> {h ? h.errors : 0}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">FFT FPS</span> {isOnline ? '60.0' : '0.0'}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">SPEC FPS</span> {isOnline ? '60.0' : '0.0'}</div>
                                    <div><span className="text-tactical-textMuted block text-[9px]">LATENCY</span> {h ? h.latency_ms.toFixed(1) : '0'} ms</div>
                                </div>
                                
                                <div className="border-t border-tactical-border pt-2 mt-1">
                                    <span className="text-tactical-textMuted block text-[9px] mb-1">LIVE JSON PANEL</span>
                                    <div className="bg-tactical-card p-2 rounded max-h-32 overflow-y-auto text-[8px] text-tactical-secondary whitespace-pre-wrap">
                                        {h?.last_json ? (
                                            (() => {
                                                try {
                                                    return JSON.stringify(JSON.parse(h.last_json), null, 2);
                                                } catch (e) {
                                                    return h.last_json;
                                                }
                                            })()
                                        ) : "WAITING FOR DATA..."}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {deletingReceiver && (
                <DeleteConfirmModal 
                    isOpen={!!deletingReceiver}
                    receiver={deletingReceiver}
                    onClose={() => setDeletingReceiver(null)}
                    onConfirm={(id) => {
                        onDeleteStation?.(id);
                        setDeletingReceiver(null);
                    }}
                />
            )}
        </div>
    );
};
