import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Activity, Moon, Sun, ShieldAlert, Wifi, Clock, Volume2, VolumeX } from 'lucide-react';
import { useAudioSystem } from '../store/useAudioSystem';

export const HeaderBar: React.FC<{ 
    connected: boolean; 
    stationCount: number; 
    targetCount: number;
    onOpenLiveReceiver: () => void;
}> = ({ 
    connected, 
    stationCount, 
    targetCount,
    onOpenLiveReceiver
}) => {
    const { theme, toggleTheme } = useTheme();
    const [time, setTime] = useState(new Date());
    const { enabled, volume, setEnabled, setVolume } = useAudioSystem();

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="h-16 border-b border-tactical-border bg-tactical-card flex items-center justify-between px-6 shrink-0 z-20 shadow-md">
            {/* Left: Logo & Mission Status */}
            <div className="flex items-center gap-6 w-1/3">
                <div className="flex items-center gap-3">
                    <div className="bg-tactical-primary/20 p-2 rounded-md">
                        <Activity className="text-tactical-primary" size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-widest leading-none text-tactical-text">
                            C4ISR COMMAND
                        </h1>
                        <span className="text-[10px] text-tactical-textMuted tracking-[0.2em] font-bold">
                            DIRECTION FINDING PLATFORM
                        </span>
                    </div>
                </div>
            </div>

            {/* Center: Clocks */}
            <div className="flex items-center justify-center gap-8 w-1/3 border-x border-tactical-border/50 h-full">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-tactical-textMuted tracking-wider font-bold">UTC TIME (ZULU)</span>
                    <span className="font-bold text-tactical-text text-lg flex items-center gap-2">
                        <Clock size={14} className="text-tactical-secondary" />
                        {time.toISOString().substring(11, 19)}Z
                    </span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-tactical-textMuted tracking-wider font-bold">LOCAL TIME</span>
                    <span className="font-bold text-tactical-text text-lg">
                        {time.toTimeString().substring(0, 8)}
                    </span>
                </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center justify-end gap-6 w-1/3">
                {/* Audio Controls */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setEnabled(!enabled)}
                        className={`p-2 rounded-md transition-colors border ${enabled ? 'text-tactical-primary border-tactical-primary bg-tactical-primary/10' : 'text-tactical-textMuted border-tactical-border hover:bg-tactical-bg'}`}
                        title="Toggle Audio Alerts"
                    >
                        {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    {enabled && (
                        <input 
                            type="range" 
                            min="0" max="1" step="0.05"
                            value={volume} 
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-16 accent-tactical-primary"
                        />
                    )}
                </div>

                <button 
                    onClick={onOpenLiveReceiver}
                    className="bg-tactical-primary/20 hover:bg-tactical-primary/30 text-tactical-primary border border-tactical-primary/50 px-4 py-1.5 rounded-md text-xs font-bold tracking-widest transition-colors flex items-center gap-2"
                >
                    <Activity size={14} /> LIVE RECEIVER
                </button>
                <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2 bg-tactical-bg px-3 py-1.5 rounded-md border border-tactical-border">
                        <Wifi size={14} className={connected ? "text-tactical-success" : "text-tactical-danger"} />
                        <span className={connected ? "text-tactical-success" : "text-tactical-danger"}>
                            {connected ? 'LINK ACTIVE' : 'NO SIGNAL'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 bg-tactical-bg px-3 py-1.5 rounded-md border border-tactical-border">
                        <span className="text-tactical-textMuted">STATIONS:</span>
                        <span className="text-tactical-secondary">{stationCount}/3</span>
                    </div>
                    <div className="flex items-center gap-2 bg-tactical-danger/10 px-3 py-1.5 rounded-md border border-tactical-danger/30">
                        <ShieldAlert size={14} className="text-tactical-danger" />
                        <span className="text-tactical-danger">{targetCount} THREATS</span>
                    </div>
                </div>
                
                {/* Theme Toggle */}
                <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-md hover:bg-tactical-bg text-tactical-text transition-colors border border-tactical-border"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </div>
    );
};
