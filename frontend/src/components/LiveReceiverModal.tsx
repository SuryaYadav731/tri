import React, { useState } from 'react';
import { X, Server, Trash2, Wifi } from 'lucide-react';
import type { ReceiverConfig } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (station: any) => Promise<any>;
    onDelete?: (stationId: string) => void;
}

export const LiveReceiverModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState<Partial<ReceiverConfig>>({
        receiver_id: '',
        name: '',
        ip_address: '0.0.0.0',
        lat: 0,
        lon: 0,
        altitude: 0,
        heading: 0,
        port: 5000,
        freq_range: '10 MHz - 6 GHz',
        status: 'ONLINE',
        description: ''
    });
    
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSave = async () => {
        console.log("✔ Save button clicked");
        console.log("Saving receiver...");
        console.log("Sending POST /api/receivers");
        console.log("Payload:\n" + JSON.stringify(formData, null, 2));
        
        setErrorMsg(null);
        setIsSaving(true);
        console.log("✔ API request sent");
        
        const res = await onSave(formData);
        
        console.log("✔ API response received", res);
        setIsSaving(false);
        
        if (res && res.success) {
            onClose();
        } else {
            setErrorMsg(res?.error || "Unknown error occurred");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-tactical-card border-2 border-tactical-border w-[600px] shadow-2xl flex flex-col font-mono text-tactical-text animate-fade-in max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-tactical-bg p-3 border-b border-tactical-border flex justify-between items-center shrink-0">
                    <h2 className="text-sm font-bold tracking-widest flex items-center gap-2">
                        <Server size={16} className="text-tactical-primary" />
                        LIVE DIRECTION FINDER CONFIGURATION
                    </h2>
                    <button onClick={onClose} className="text-tactical-textMuted hover:text-tactical-danger transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-5 space-y-4 flex-1">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">RECEIVER ID</label>
                            <input 
                                type="text" name="receiver_id" value={formData.receiver_id} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                                placeholder="e.g. DF001"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">RECEIVER NAME</label>
                            <input 
                                type="text" name="name" value={formData.name} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                                placeholder="e.g. ALPHA SITE"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">IP ADDRESS</label>
                            <input 
                                type="text" name="ip_address" value={formData.ip_address} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                                placeholder="e.g. 0.0.0.0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">LATITUDE</label>
                            <input 
                                type="number" step="0.000001" name="lat" value={formData.lat} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">LONGITUDE</label>
                            <input 
                                type="number" step="0.000001" name="lon" value={formData.lon} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">ALTITUDE (m)</label>
                            <input 
                                type="number" step="1" name="altitude" value={formData.altitude} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">HEADING (° True)</label>
                            <input 
                                type="number" step="0.1" name="heading" value={formData.heading} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">TCP PORT</label>
                            <input 
                                type="number" name="port" value={formData.port} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">FREQ RANGE</label>
                            <input 
                                type="text" name="freq_range" value={formData.freq_range} onChange={handleChange}
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-tactical-textMuted tracking-wider">DESCRIPTION</label>
                        <textarea 
                            name="description" value={formData.description} onChange={handleChange}
                            className="w-full bg-tactical-bg border border-tactical-border rounded px-2 py-1.5 text-xs focus:border-tactical-primary focus:outline-none h-16"
                        />
                    </div>

                </div>

                {/* Footer / Actions */}
                <div className="bg-tactical-bg/80 p-3 border-t border-tactical-border flex justify-between items-center shrink-0">
                    <div className="flex gap-2 items-center flex-1">
                        {/* Status badge */}
                        <div className="bg-tactical-card px-3 py-1.5 rounded flex items-center gap-2 border border-tactical-border shrink-0">
                            <div className="w-2 h-2 rounded-full bg-tactical-success marker-pulse"></div>
                            <span className="text-xs font-bold text-tactical-textMuted tracking-wider">READY</span>
                        </div>
                        {errorMsg && (
                            <div className="ml-2 text-xs font-bold text-tactical-danger truncate bg-tactical-danger/10 px-2 py-1 rounded border border-tactical-danger/30">
                                {errorMsg}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {onDelete && formData.receiver_id && (
                            <button 
                                className="text-tactical-textMuted hover:text-tactical-danger px-3 py-1.5 flex items-center gap-1 text-xs font-bold transition-colors"
                                onClick={() => {
                                    if (window.confirm(`Delete receiver ${formData.receiver_id}?\n\nYES: Delete and disconnect\nNO: Cancel`)) {
                                        onDelete(formData.receiver_id as string);
                                        onClose();
                                    }
                                }}
                                disabled={isSaving}
                            >
                                <Trash2 size={14} /> DELETE
                            </button>
                        )}
                        <button 
                            className={`bg-tactical-success/20 text-tactical-success border border-tactical-success/50 hover:bg-tactical-success/30 px-3 py-1.5 rounded flex items-center gap-1 text-xs font-bold transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Wifi size={14} /> {isSaving ? "SAVING..." : "SAVE & CONNECT"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
