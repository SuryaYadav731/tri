import { useSystemStore } from '../store/useSystemStore';
import { format } from 'date-fns';

export const MilitaryTimeline = () => {
    const { events } = useSystemStore();

    return (
        <div className="flex flex-col h-full bg-tactical-card text-tactical-text border-t border-tactical-border font-mono text-xs overflow-hidden">
            <div className="bg-tactical-bg text-tactical-primary px-2 py-1 border-b border-tactical-border font-bold sticky top-0 uppercase flex justify-between">
                <span>Event Timeline</span>
                <span className="text-tactical-textMuted">{events.length} Events Logged</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {events.map((ev, i) => {
                    let colorClass = 'text-tactical-text';
                    if (ev.severity === 'warning') colorClass = 'text-tactical-warning';
                    if (ev.severity === 'danger') colorClass = 'text-tactical-danger';
                    if (ev.severity === 'success') colorClass = 'text-tactical-success';
                    
                    const timeStr = format(new Date(ev.timestamp * 1000), 'HH:mm:ss.SSS');
                    return (
                        <div key={ev.id || i} className="flex gap-2 border-b border-tactical-border/30 pb-1">
                            <span className="text-tactical-textMuted shrink-0">[{timeStr}]</span>
                            <span className={`font-semibold shrink-0 w-24 ${colorClass}`}>{ev.type}</span>
                            <span className="truncate">{ev.message}</span>
                        </div>
                    );
                })}
                {events.length === 0 && (
                    <div className="text-tactical-textMuted text-center mt-4 italic">No recent events</div>
                )}
            </div>
        </div>
    );
};
