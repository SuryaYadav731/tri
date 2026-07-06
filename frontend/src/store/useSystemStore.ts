import { create } from 'zustand';
import type { SystemState, DFStationReport, TargetTrack, MapOverlays } from '../types';

interface SystemStoreState extends SystemState {
    overlays: MapOverlays;
    setSystemState: (state: Partial<SystemState>) => void;
    updateReport: (report: DFStationReport) => void;
    updateTarget: (target: TargetTrack) => void;
    updateOverlays: (overlays: Partial<MapOverlays>) => void;
    removeReceiver: (id: string) => void;
}

export const useSystemStore = create<SystemStoreState>((set) => ({
    receivers: [],
    reports: [],
    targets: [],
    health: [],
    events: [],
    fft_data: undefined,
    overlays: {
        showReceivers: true,
        showBearings: true,
        showTargets: true,
        showConfidence: true,
        showErrorRadius: true,
        showSpectrumActivity: false,
        showHeatmap: false,
        showThreats: true,
        bearingLineLengthKm: 50
    },
    setSystemState: (state) => set((prev) => ({ ...prev, ...state })),
    updateReport: (report) => set((state) => {
        const index = state.reports.findIndex(r => r.system_id === report.system_id);
        if (index >= 0) {
            const newReports = [...state.reports];
            newReports[index] = report;
            return { reports: newReports };
        }
        return { reports: [...state.reports, report] };
    }),
    updateTarget: (target) => set((state) => {
        const index = state.targets.findIndex(t => t.track_id === target.track_id);
        if (index >= 0) {
            const newTargets = [...state.targets];
            newTargets[index] = target;
            return { targets: newTargets };
        }
        return { targets: [...state.targets, target] };
    }),
    removeReceiver: (id) => set((state) => ({
        receivers: state.receivers.filter(r => r.receiver_id !== id),
        reports: state.reports.filter(r => r.system_id !== id),
        health: state.health.filter(h => h.receiver_id !== id)
    })),
    updateOverlays: (overlays) => set((state) => ({
        overlays: { ...state.overlays, ...overlays }
    }))
}));
