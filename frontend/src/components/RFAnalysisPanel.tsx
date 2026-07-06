import { useSystemStore } from '../store/useSystemStore';

export const RFAnalysisPanel = () => {
    const { reports } = useSystemStore();
    
    // Get the most recent report or aggregate
    const latestReport = reports.length > 0 ? reports[reports.length - 1] : null;

    return (
        <div className="flex flex-col h-full bg-tactical-card text-tactical-text p-2 font-mono text-sm border-b border-tactical-border">
            <div className="text-tactical-primary font-bold mb-2 uppercase border-b border-tactical-border pb-1">
                RF Analysis
            </div>
            
            <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Current Freq</span>
                    <span className="font-semibold text-tactical-secondary">
                        {latestReport ? `${latestReport.freq.toFixed(4)} MHz` : '---'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Bandwidth</span>
                    <span className="font-semibold">
                        {latestReport?.bandwidth ? `${(latestReport.bandwidth / 1000).toFixed(1)} kHz` : '25.0 kHz'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Power</span>
                    <span className="font-semibold text-tactical-warning">
                        {latestReport?.signal_power ? `${latestReport.signal_power.toFixed(1)} dBm` : '---'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">SNR</span>
                    <span className="font-semibold text-tactical-success">
                        {latestReport?.snr ? `${latestReport.snr.toFixed(1)} dB` : '---'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Noise Floor</span>
                    <span className="font-semibold text-tactical-textMuted">
                        {latestReport?.noise_floor ? `${latestReport.noise_floor.toFixed(1)} dBm` : '-120.0 dBm'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Signal Quality</span>
                    <span className="font-semibold">
                        {latestReport?.signal_quality ? `${latestReport.signal_quality}%` : '---'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Modulation</span>
                    <span className="font-semibold text-tactical-primary">
                        {latestReport?.modulation_type || 'UNKNOWN'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Duration</span>
                    <span className="font-semibold">
                        {latestReport?.signal_duration ? `${latestReport.signal_duration.toFixed(2)} s` : '---'}
                    </span>
                </div>
            </div>
        </div>
    );
};
