import React from 'react';
import { X, AlertTriangle, Server, Trash2, PowerOff, Database } from 'lucide-react';
import type { ReceiverConfig } from '../types';

interface Props {
    isOpen: boolean;
    receiver: ReceiverConfig | null;
    onClose: () => void;
    onConfirm: (stationId: string) => void;
}

export const DeleteConfirmModal: React.FC<Props> = ({ isOpen, receiver, onClose, onConfirm }) => {
    if (!isOpen || !receiver) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-tactical-card border-2 border-tactical-danger w-[500px] shadow-2xl flex flex-col font-mono text-tactical-text animate-fade-in relative overflow-hidden">
                {/* Danger Stripe */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ef4444_10px,#ef4444_20px)]"></div>
                
                {/* Header */}
                <div className="bg-tactical-danger/10 p-3 border-b border-tactical-danger/30 flex justify-between items-center shrink-0 mt-1">
                    <h2 className="text-sm font-bold tracking-widest flex items-center gap-2 text-tactical-danger">
                        <AlertTriangle size={18} />
                        DELETE RECEIVER
                    </h2>
                    <button onClick={onClose} className="text-tactical-textMuted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <div className="bg-tactical-bg border border-tactical-border p-3 rounded grid grid-cols-2 gap-y-2 text-xs font-bold">
                        <span className="text-tactical-textMuted">Receiver ID</span>
                        <span className="text-tactical-primary flex items-center gap-1"><Server size={12}/> {receiver.receiver_id}</span>
                        
                        <span className="text-tactical-textMuted">Receiver Name</span>
                        <span>{receiver.name || "Unknown"}</span>
                        
                        <span className="text-tactical-textMuted">TCP Port</span>
                        <span className="text-tactical-warning">{receiver.port}</span>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-tactical-textMuted mb-2 tracking-wider">THIS ACTION WILL:</p>
                        <ul className="space-y-1 text-xs font-bold text-tactical-danger/80">
                            <li className="flex items-center gap-2"><PowerOff size={12}/> Stop TCP Listener</li>
                            <li className="flex items-center gap-2"><PowerOff size={12}/> Close Socket</li>
                            <li className="flex items-center gap-2"><Database size={12}/> Remove Receiver</li>
                            <li className="flex items-center gap-2"><Trash2 size={12}/> Remove Marker & Bearing Line</li>
                            <li className="flex items-center gap-2"><Trash2 size={12}/> Remove Live Data & WebSocket Updates</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-tactical-bg p-3 border-t border-tactical-border flex justify-end gap-3 shrink-0">
                    <button 
                        className="px-4 py-2 border border-tactical-border hover:bg-tactical-bg text-xs font-bold transition-colors"
                        onClick={onClose}
                    >
                        CANCEL
                    </button>
                    <button 
                        className="px-4 py-2 bg-tactical-danger/20 border border-tactical-danger text-tactical-danger hover:bg-tactical-danger hover:text-white flex items-center gap-2 text-xs font-bold transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        onClick={() => {
                            onConfirm(receiver.receiver_id);
                            onClose();
                        }}
                    >
                        <Trash2 size={14} /> CONFIRM DELETE
                    </button>
                </div>
            </div>
        </div>
    );
};
