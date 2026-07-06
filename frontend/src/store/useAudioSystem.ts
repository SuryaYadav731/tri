import { create } from 'zustand';

interface AudioStore {
    enabled: boolean;
    volume: number;
    setEnabled: (enabled: boolean) => void;
    setVolume: (volume: number) => void;
    playRadarPing: () => void;
    playTargetLocked: () => void;
    playTargetLost: () => void;
}

const getAudioContext = () => {
    if (typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) return new AudioContext();
    }
    return null;
};

const audioCtx = getAudioContext();

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number) => {
    if (!audioCtx) return;
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    // Envelope
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

export const useAudioSystem = create<AudioStore>((set, get) => ({
    enabled: false,
    volume: 0.5,
    setEnabled: (enabled) => set({ enabled }),
    setVolume: (volume) => set({ volume }),
    
    playRadarPing: () => {
        if (!get().enabled) return;
        playTone(1200, 'sine', 0.2, get().volume * 0.5);
    },
    
    playTargetLocked: () => {
        if (!get().enabled) return;
        playTone(1500, 'square', 0.1, get().volume * 0.4);
        setTimeout(() => playTone(1800, 'square', 0.2, get().volume * 0.4), 100);
    },
    
    playTargetLost: () => {
        if (!get().enabled) return;
        playTone(400, 'sawtooth', 0.4, get().volume * 0.4);
        setTimeout(() => playTone(300, 'sawtooth', 0.4, get().volume * 0.4), 200);
    }
}));
