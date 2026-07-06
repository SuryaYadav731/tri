import type { TargetTrack } from '../types';

export const TargetDetailsPanel = ({ target }: { target: TargetTrack | null }) => {
    if (!target) {
        return (
            <div className="flex flex-col h-full bg-tactical-card text-tactical-text p-2 font-mono text-sm border-l border-tactical-border">
                <div className="text-tactical-primary font-bold mb-2 uppercase border-b border-tactical-border pb-1">
                    Target Analysis
                </div>
                <div className="flex-1 flex items-center justify-center text-tactical-textMuted italic">
                    NO TARGET SELECTED
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-tactical-card text-tactical-text p-2 font-mono text-sm border-l border-tactical-border overflow-y-auto">
            <div className="text-tactical-primary font-bold mb-2 uppercase border-b border-tactical-border pb-1 flex justify-between">
                <span>Target: {target.track_id}</span>
                <span className={target.threat_level === 'Jammer' ? 'text-tactical-danger' : 'text-tactical-warning'}>
                    {target.classification}
                </span>
            </div>

            <div className="space-y-4">
                {/* Positional Data */}
                <div>
                    <div className="text-xs text-tactical-textMuted uppercase mb-1 border-b border-tactical-border/30">Positional Data</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <span className="text-tactical-textMuted">Latitude:</span>
                        <span className="text-right">{target.lat.toFixed(6)}°</span>
                        <span className="text-tactical-textMuted">Longitude:</span>
                        <span className="text-right">{target.lon.toFixed(6)}°</span>
                        <span className="text-tactical-textMuted">Speed:</span>
                        <span className="text-right">{(target.speed * 3.6).toFixed(1)} km/h</span>
                        <span className="text-tactical-textMuted">Heading:</span>
                        <span className="text-right">{target.heading.toFixed(1)}°</span>
                        <span className="text-tactical-textMuted">Last Update:</span>
                        <span className="text-right">{((Date.now()/1000) - target.last_update).toFixed(1)}s ago</span>
                    </div>
                </div>

                {/* Geometric Analysis */}
                <div>
                    <div className="text-xs text-tactical-textMuted uppercase mb-1 border-b border-tactical-border/30">Geometric Analysis</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <span className="text-tactical-textMuted">Intersection Angle:</span>
                        <span className="text-right">{target.intersection_angle?.toFixed(1)}°</span>
                        <span className="text-tactical-textMuted">Estimated Accuracy:</span>
                        <span className="text-right">{target.estimated_accuracy?.toFixed(1)}%</span>
                        <span className="text-tactical-textMuted">GDOP:</span>
                        <span className="text-right">{target.gdop.toFixed(2)}</span>
                        <span className="text-tactical-textMuted">Geometry Score:</span>
                        <span className="text-right text-tactical-success">{target.geometry_score?.toFixed(1)}/100</span>
                        <span className="text-tactical-textMuted">Error Radius:</span>
                        <span className="text-right text-tactical-warning">{target.error_radius.toFixed(0)} m</span>
                        <span className="text-tactical-textMuted">Confidence:</span>
                        <span className="text-right text-tactical-primary">{target.confidence.toFixed(1)}%</span>
                        <span className="text-tactical-textMuted">Stations:</span>
                        <span className="text-right">{target.station_count}</span>
                    </div>
                </div>

                {/* Distance/Bearing from Receivers */}
                {Object.keys(target.distances || {}).length > 0 && (
                <div>
                    <div className="text-xs text-tactical-textMuted uppercase mb-1 border-b border-tactical-border/30">Receiver Distances</div>
                    <div className="flex flex-col gap-1 text-xs">
                        {Object.entries(target.distances).map(([rid, dist]) => (
                            <div key={rid} className="flex justify-between">
                                <span className="text-tactical-textMuted">{rid}</span>
                                <span>{dist.toFixed(2)} km @ {target.bearings[rid]?.toFixed(1)}°</span>
                            </div>
                        ))}
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};
