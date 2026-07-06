import { useEffect, useRef } from 'react';
import { useSystemStore } from '../store/useSystemStore';

export const WaterfallPanel = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { fft_data } = useSystemStore();
    const maxRows = 5000;
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !fft_data) return;

        const keys = Object.keys(fft_data);
        if (keys.length === 0) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const resize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        };
        
        if (canvas.width === 0) {
             resize();
             window.addEventListener('resize', resize);
        }

        const width = canvas.width;
        const height = canvas.height;
        
        // Take first stream as reference for length
        const refData = fft_data[keys[0]].data;
        const dataLength = refData.length;
        
        // Compute max across all streams
        const combinedData = new Array(dataLength).fill(-999);
        for (const sid of keys) {
            const stream = fft_data[sid].data;
            if (stream.length === dataLength) {
                for (let i = 0; i < dataLength; i++) {
                    if (stream[i] > combinedData[i]) {
                        combinedData[i] = stream[i];
                    }
                }
            }
        }

        const min_db = -120;
        const max_db = -20;
        
        if (!offscreenRef.current || offscreenRef.current.width !== dataLength) {
            const off = document.createElement('canvas');
            off.width = dataLength;
            off.height = maxRows;
            offscreenRef.current = off;
            const octx = off.getContext('2d', { alpha: false });
            if (octx) {
                octx.fillStyle = 'black';
                octx.fillRect(0, 0, off.width, off.height);
            }
        }
        
        const offCanvas = offscreenRef.current;
        const octx = offCanvas.getContext('2d', { alpha: false });
        if (!octx) return;

        octx.drawImage(offCanvas, 0, 0, dataLength, maxRows - 1, 0, 1, dataLength, maxRows - 1);

        const imgData = octx.createImageData(dataLength, 1);
        for (let x = 0; x < dataLength; x++) {
            const val = Math.max(min_db, Math.min(max_db, combinedData[x]));
            const normalized = (val - min_db) / (max_db - min_db);
            const colorVal = Math.floor(normalized * 255);
            
            const index = x * 4;
            if (colorVal < 64) {
                imgData.data[index] = 0;
                imgData.data[index + 1] = 0;
                imgData.data[index + 2] = colorVal * 4;
            } else if (colorVal < 128) {
                imgData.data[index] = 0;
                imgData.data[index + 1] = (colorVal - 64) * 4;
                imgData.data[index + 2] = 255 - (colorVal - 64) * 4;
            } else if (colorVal < 192) {
                imgData.data[index] = (colorVal - 128) * 4;
                imgData.data[index + 1] = 255;
                imgData.data[index + 2] = 0;
            } else {
                imgData.data[index] = 255;
                imgData.data[index + 1] = 255 - (colorVal - 192) * 4;
                imgData.data[index + 2] = 0;
            }
            imgData.data[index + 3] = 255;
        }
        octx.putImageData(imgData, 0, 0);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offCanvas, 0, 0, width, height);

        return () => window.removeEventListener('resize', resize);
    }, [fft_data]);

    return (
        <div className="w-full h-full flex flex-col bg-tactical-bg border border-tactical-border relative">
             <div className="absolute top-1 left-2 text-xs text-tactical-primary z-10 bg-tactical-bg px-1 shadow font-bold">
                SPECTROGRAM {fft_data ? `(${Object.keys(fft_data).length} STREAMS)` : ''}
            </div>
            <div className="flex-1 w-full relative overflow-hidden">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>
        </div>
    );
};
