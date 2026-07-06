import React from 'react';
import type { TargetTrack } from '../types';
import { Crosshair, Radio, ShieldAlert } from 'lucide-react';

interface Props {
    targets: TargetTrack[];
}

export const TargetPanel: React.FC<Props> = ({ targets }) => {
    return (
        <div className="absolute top-4 right-4 w-80 flex flex-col gap-4 z-10 pointer-events-none">
            {targets.map(target => (
                <div key={target.track_id} className="glass-panel p-4 rounded-lg pointer-events-auto border-l-4 border-l-tactical-red text-sm">
                    <div className="flex justify-between items-center border-b border-tactical-border pb-2 mb-2">
                        <span className="font-bold text-tactical-red flex items-center gap-2">
                            <Crosshair size={16} />
                            {target.track_id}
                        </span>
                        <span className="text-xs bg-tactical-red/20 text-tactical-red px-2 py-1 rounded">
                            {target.classification}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                            <span className="text-gray-500 text-xs block">LATITUDE</span>
                            <span>{target.lat.toFixed(6)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 text-xs block">LONGITUDE</span>
                            <span>{target.lon.toFixed(6)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-tactical-amber mb-2">
                        <div className="flex items-center gap-1">
                            <Radio size={14} />
                            <span>{target.freq.toFixed(3)} MHz</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ShieldAlert size={14} />
                            <span>Conf: {target.confidence.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
