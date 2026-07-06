import { useSystemStore } from '../store/useSystemStore';

export const SignalDetectorPanel = () => {
    const { targets } = useSystemStore();

    return (
        <div className="flex flex-col h-full bg-tactical-card text-tactical-text p-2 font-mono text-sm border-l border-tactical-border">
            <div className="text-tactical-primary font-bold mb-2 uppercase border-b border-tactical-border pb-1">
                Detected Signals
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {targets.map(t => (
                    <div key={t.track_id} className="border border-tactical-border/50 bg-tactical-bg p-2 hover:border-tactical-primary transition-colors cursor-pointer group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-tactical-primary group-hover:bg-tactical-warning"></div>
                        <div className="flex justify-between items-start ml-2">
                            <span className="font-bold text-tactical-primary">{t.freq.toFixed(3)} MHz</span>
                            <span className="text-xs text-tactical-textMuted">{t.classification}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs mt-1 ml-2">
                            <span className="text-tactical-textMuted">Conf: <span className="text-tactical-text">{t.confidence.toFixed(1)}%</span></span>
                            <span className="text-tactical-textMuted">Dets: <span className="text-tactical-text">{t.detection_count}</span></span>
                            <span className="text-tactical-textMuted">Rxs: <span className="text-tactical-text">{t.station_count}</span></span>
                            <span className="text-tactical-textMuted">Status: <span className="text-tactical-success">ACTIVE</span></span>
                        </div>
                    </div>
                ))}
                {targets.length === 0 && (
                    <div className="text-tactical-textMuted text-center mt-4 italic">No active signals</div>
                )}
            </div>
        </div>
    );
};
