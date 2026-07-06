import React, { useEffect, useState } from 'react';
import { Activity, RadioReceiver, ShieldAlert, Zap, Target } from 'lucide-react';
import { useSystemStore } from '../store/useSystemStore';

export const AnalyticsPanel: React.FC = () => {
    const { receivers, reports, targets } = useSystemStore();
    const [bars, setBars] = useState<number[]>(Array(50).fill(0));

    // Simulate animated spectrum analyzer
    useEffect(() => {
        const interval = setInterval(() => {
            setBars(prev => prev.map(() => Math.random() * 100));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const onlineReceivers = receivers.filter(r => r.status === 'ONLINE').length;
    const offlineReceivers = receivers.length - onlineReceivers;
    const activeTracks = targets.length;
    
    let avgConf = 0;
    if (targets.length > 0) {
        avgConf = targets.reduce((acc, t) => acc + t.confidence, 0) / targets.length;
    }

    let maxSnr = 0;
    let strongestPower = -120;
    reports.forEach(r => {
        if (r.snr && r.snr > maxSnr) maxSnr = r.snr;
        if (r.signal_power && r.signal_power > strongestPower) strongestPower = r.signal_power;
    });

    return (
        <div className="h-[250px] bg-tactical-card border-t border-tactical-border grid grid-cols-5 gap-0 z-10 w-full overflow-hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {/* KPI Dashboard */}
            <div className="col-span-2 border-r border-tactical-border flex flex-col">
                <div className="p-2 border-b border-tactical-border bg-tactical-bg/50 shrink-0">
                    <h3 className="text-[10px] font-bold text-tactical-text tracking-widest flex items-center gap-2">
                        <Activity size={12} className="text-tactical-primary" />
                        RF INTELLIGENCE DASHBOARD
                    </h3>
                </div>
                <div className="flex-1 p-2 grid grid-cols-3 gap-2 overflow-y-auto">
                    <div className="bg-tactical-bg border border-tactical-border p-2 rounded flex flex-col justify-between">
                        <span className="text-[9px] text-tactical-textMuted font-bold">ONLINE RECEIVERS</span>
                        <span className="text-lg font-mono text-tactical-success font-bold">{onlineReceivers}</span>
                    </div>
                    <div className="bg-tactical-bg border border-tactical-border p-2 rounded flex flex-col justify-between">
                        <span className="text-[9px] text-tactical-textMuted font-bold">OFFLINE RECEIVERS</span>
                        <span className="text-lg font-mono text-tactical-danger font-bold">{offlineReceivers}</span>
                    </div>
                    <div className="bg-tactical-bg border border-tactical-border p-2 rounded flex flex-col justify-between">
                        <span className="text-[9px] text-tactical-textMuted font-bold">SIGNALS DETECTED</span>
                        <span className="text-lg font-mono text-tactical-secondary font-bold">{reports.length}</span>
                    </div>
                    
                    <div className="bg-tactical-bg border border-tactical-border p-2 rounded flex flex-col justify-between">
                        <span className="text-[9px] text-tactical-textMuted font-bold flex items-center gap-1"><Target size={10}/> ACTIVE TRACKS</span>
                        <span className="text-lg font-mono text-tactical-warning font-bold">{activeTracks}</span>
                    </div>
                    <div className="bg-tactical-bg border border-tactical-border p-2 rounded flex flex-col justify-between">
                        <span className="text-[9px] text-tactical-textMuted font-bold flex items-center gap-1"><ShieldAlert size={10}/> AVG CONFIDENCE</span>
                        <span className="text-lg font-mono text-tactical-primary font-bold">{avgConf.toFixed(1)}%</span>
                    </div>
                    <div className="bg-tactical-bg border border-tactical-border p-2 rounded flex flex-col justify-between">
                        <span className="text-[9px] text-tactical-textMuted font-bold flex items-center gap-1"><Zap size={10}/> HIGHEST SNR</span>
                        <span className="text-lg font-mono text-tactical-text font-bold">{maxSnr.toFixed(1)} dB</span>
                    </div>
                </div>
            </div>

            {/* Spectrum Activity Visualization */}
            <div className="col-span-3 flex flex-col bg-tactical-bg">
                <div className="p-2 border-b border-tactical-border bg-tactical-card/50 shrink-0 flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-tactical-text tracking-widest flex items-center gap-2">
                        <RadioReceiver size={12} className="text-tactical-secondary" />
                        SPECTRUM ACTIVITY HEATMAP
                    </h3>
                    <span className="text-[10px] text-tactical-textMuted font-bold">Max Power: {strongestPower.toFixed(1)} dBm</span>
                </div>
                <div className="flex-1 p-4 flex items-end justify-between gap-[2px]">
                    {bars.map((val, i) => {
                        const isHigh = val > 80;
                        const isMedium = val > 50;
                        return (
                            <div key={i} className="w-full flex flex-col justify-end h-full group relative">
                                <div 
                                    className={`w-full rounded-t transition-all duration-75 ${
                                        isHigh ? 'bg-tactical-danger' : 
                                        isMedium ? 'bg-tactical-warning' : 
                                        'bg-tactical-primary'
                                    }`} 
                                    style={{ height: `${val}%`, opacity: isHigh ? 1 : 0.7 }} 
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
