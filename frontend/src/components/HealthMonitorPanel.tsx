import { useSystemStore } from '../store/useSystemStore';

export const HealthMonitorPanel = () => {
    const { health } = useSystemStore();

    // Aggregate stats
    const totalCPU = health.reduce((acc, curr) => acc + (curr.cpu_usage || 0), 0) / (health.length || 1);
    const totalRAM = health.reduce((acc, curr) => acc + (curr.ram_usage || 0), 0) / (health.length || 1);
    const totalTemp = health.reduce((acc, curr) => acc + (curr.temperature || 0), 0) / (health.length || 1);
    const totalPackets = health.reduce((acc, curr) => acc + curr.packets_per_sec, 0);
    const avgLatency = health.reduce((acc, curr) => acc + curr.latency_ms, 0) / (health.length || 1);
    const dropped = health.reduce((acc, curr) => acc + curr.dropped_packets, 0);

    return (
        <div className="flex flex-col h-full bg-tactical-card text-tactical-text p-2 font-mono text-sm">
            <div className="text-tactical-primary font-bold mb-2 uppercase border-b border-tactical-border pb-1 flex justify-between">
                <span>System Health</span>
                <span className={health.length > 0 ? "text-tactical-success" : "text-tactical-danger"}>
                    {health.length > 0 ? "ONLINE" : "OFFLINE"}
                </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Avg CPU</span>
                    <div className="w-full bg-tactical-bg h-2 mt-1 rounded overflow-hidden">
                        <div className={`h-full ${totalCPU > 80 ? 'bg-tactical-danger' : 'bg-tactical-success'}`} style={{width: `${totalCPU}%`}}></div>
                    </div>
                    <span className="text-xs mt-0.5">{totalCPU.toFixed(1)}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Avg RAM</span>
                    <div className="w-full bg-tactical-bg h-2 mt-1 rounded overflow-hidden">
                        <div className={`h-full ${totalRAM > 80 ? 'bg-tactical-danger' : 'bg-tactical-primary'}`} style={{width: `${totalRAM}%`}}></div>
                    </div>
                    <span className="text-xs mt-0.5">{totalRAM.toFixed(1)}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Temp</span>
                    <span className={`font-semibold ${totalTemp > 70 ? 'text-tactical-danger' : 'text-tactical-warning'}`}>
                        {totalTemp.toFixed(1)}°C
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Total Packets/s</span>
                    <span className="font-semibold text-tactical-secondary">
                        {totalPackets.toFixed(0)}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Avg Latency</span>
                    <span className="font-semibold">
                        {avgLatency.toFixed(1)} ms
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-tactical-textMuted text-xs">Dropped</span>
                    <span className={`font-semibold ${dropped > 0 ? 'text-tactical-danger' : 'text-tactical-success'}`}>
                        {dropped}
                    </span>
                </div>
            </div>
        </div>
    );
};
