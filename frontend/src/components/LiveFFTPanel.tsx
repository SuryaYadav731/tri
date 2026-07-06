import { useEffect, useRef, useState } from 'react';
import { useSystemStore } from '../store/useSystemStore';

export const LiveFFTPanel = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { fft_data } = useSystemStore();
    const peakHoldRefs = useRef<Record<string, number[]>>({});
    const avgDataRefs = useRef<Record<string, number[]>>({});
    const [peakHoldOn, setPeakHoldOn] = useState(true);
    const [avgOn, setAvgOn] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !fft_data) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const keys = Object.keys(fft_data);
        if (keys.length === 0) return;

        const width = canvas.width;
        const height = canvas.height;
        const min_db = -120;
        const max_db = -20;

        // Auto scale canvas
        const resize = () => {
            if (canvas.parentElement && (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight)) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
                peakHoldRefs.current = {};
                avgDataRefs.current = {};
            }
        };
        resize();
        window.addEventListener('resize', resize);

        // Clear background
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const y = (i / 10) * height;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            const x = (i / 10) * width;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        ctx.stroke();

        const renderLine = (plotData: number[], color: string, lineWidth: number, fill: boolean = false) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineJoin = 'round';

            for (let i = 0; i < plotData.length; i++) {
                const val = Math.max(min_db, Math.min(max_db, plotData[i]));
                const normalized = (val - min_db) / (max_db - min_db);
                const x = (i / plotData.length) * width;
                const y = height - (normalized * height);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            if (fill) {
                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.fillStyle = color.replace('1)', '0.2)');
                ctx.fill();
            }
        };

        const colors = ['rgba(0, 255, 0, 1)', 'rgba(0, 150, 255, 1)', 'rgba(255, 0, 255, 1)', 'rgba(255, 255, 0, 1)'];
        let colorIdx = 0;

        for (const sid of keys) {
            const data = fft_data[sid].data;
            const c = colors[colorIdx % colors.length];
            colorIdx++;

            if (!peakHoldRefs.current[sid] || peakHoldRefs.current[sid].length !== data.length) {
                peakHoldRefs.current[sid] = new Array(data.length).fill(-999);
            }
            if (!avgDataRefs.current[sid] || avgDataRefs.current[sid].length !== data.length) {
                avgDataRefs.current[sid] = new Array(data.length).fill(data[0] || -120);
            }

            const pRef = peakHoldRefs.current[sid];
            const aRef = avgDataRefs.current[sid];

            for (let i = 0; i < data.length; i++) {
                if (data[i] > pRef[i]) pRef[i] = data[i];
                else pRef[i] -= 0.5; // decay
                aRef[i] = aRef[i] * 0.8 + data[i] * 0.2;
            }

            if (peakHoldOn) renderLine(pRef, c.replace('1)', '0.4)'), 1);
            if (avgOn) renderLine(aRef, c.replace('1)', '0.6)'), 2);
            renderLine(data, c, 1, false);
        }

        return () => window.removeEventListener('resize', resize);
    }, [fft_data, peakHoldOn, avgOn]);

    return (
        <div className="w-full h-full flex flex-col bg-tactical-bg border border-tactical-border relative group">
            <div className="absolute top-1 left-2 text-xs text-tactical-primary z-10 bg-tactical-bg px-1 shadow font-bold">
                FFT SPECTRUM {fft_data ? `(${Object.keys(fft_data).length} STREAMS)` : ''}
            </div>
            
            <div className="absolute top-1 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => setPeakHoldOn(!peakHoldOn)}
                    className={`text-[10px] px-2 py-0.5 border ${peakHoldOn ? 'border-tactical-primary text-tactical-primary bg-tactical-primary/10' : 'border-tactical-textMuted text-tactical-textMuted'}`}
                >
                    PEAK
                </button>
                <button 
                    onClick={() => setAvgOn(!avgOn)}
                    className={`text-[10px] px-2 py-0.5 border ${avgOn ? 'border-tactical-secondary text-tactical-secondary bg-tactical-secondary/10' : 'border-tactical-textMuted text-tactical-textMuted'}`}
                >
                    AVG
                </button>
            </div>

            <div className="flex-1 w-full relative overflow-hidden">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>
        </div>
    );
};
