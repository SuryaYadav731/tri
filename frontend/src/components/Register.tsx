import React, { useState } from 'react';
import { Shield, Check, UserPlus } from 'lucide-react';

export const Register: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [consent, setConsent] = useState(false);

    const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('Checkbox clicked');
        console.log('Checked:', e.target.checked);
        setConsent(e.target.checked);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!consent) return;
        console.log('Form submitted', formData);
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-tactical-card border-2 border-tactical-border w-full max-w-md shadow-2xl flex flex-col font-mono text-tactical-text relative z-10">
                {/* Header */}
                <div className="bg-tactical-bg p-4 border-b border-tactical-border flex items-center gap-3">
                    <Shield className="text-tactical-primary" size={24} />
                    <h2 className="text-lg font-bold tracking-widest text-tactical-primary">OPERATOR REGISTRATION</h2>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-tactical-textMuted tracking-wider">CALLSIGN / USERNAME</label>
                            <input 
                                type="text"
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-3 py-2 text-sm focus:border-tactical-primary focus:outline-none focus:ring-1 focus:ring-tactical-primary"
                                placeholder="e.g. GHOST-Actual"
                                value={formData.username}
                                onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-tactical-textMuted tracking-wider">CLEARANCE CODE</label>
                            <input 
                                type="password"
                                className="w-full bg-tactical-bg border border-tactical-border rounded px-3 py-2 text-sm focus:border-tactical-primary focus:outline-none focus:ring-1 focus:ring-tactical-primary"
                                placeholder="********"
                                value={formData.password}
                                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Consent Checkbox Area */}
                    <div className="bg-tactical-bg/50 border border-tactical-border/50 p-4 rounded relative">
                        {/* We use a flex layout with pointer-events-auto on the whole row to ensure accessibility */}
                        <div className="flex items-start gap-3 relative z-20 pointer-events-auto">
                            <div className="relative flex items-center h-5">
                                <input
                                    type="checkbox"
                                    id="consent-checkbox"
                                    checked={consent}
                                    onChange={handleConsentChange}
                                    className="peer sr-only" /* Hide native but keep accessible */
                                />
                                {/* Military-style animated checkmark box */}
                                <label 
                                    htmlFor="consent-checkbox"
                                    className="w-5 h-5 border-2 border-tactical-border bg-tactical-bg flex items-center justify-center cursor-pointer pointer-events-auto transition-colors peer-focus:ring-2 peer-focus:ring-tactical-primary peer-checked:border-tactical-success peer-checked:bg-tactical-success/20 group hover:border-tactical-primary"
                                >
                                    <Check 
                                        size={14} 
                                        className={`text-tactical-success transition-all duration-300 transform ${consent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} 
                                        strokeWidth={4}
                                    />
                                </label>
                            </div>
                            
                            <label 
                                htmlFor="consent-checkbox" 
                                className="text-xs text-tactical-textMuted leading-tight cursor-pointer pointer-events-auto hover:text-tactical-text transition-colors select-none"
                            >
                                I acknowledge that I am accessing a restricted military network. 
                                I consent to continuous monitoring, interception, and search of all activity on this system. 
                                <span className="block mt-1 text-[10px] text-tactical-warning font-bold uppercase tracking-wider">
                                    Unauthorized access is strictly prohibited.
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit"
                        disabled={!consent}
                        className={`w-full py-3 flex items-center justify-center gap-2 font-bold tracking-widest transition-all duration-300 ${
                            consent 
                            ? 'bg-tactical-success/20 text-tactical-success border border-tactical-success hover:bg-tactical-success/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer' 
                            : 'bg-tactical-bg border border-tactical-border text-tactical-textMuted opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <UserPlus size={18} />
                        AUTHORIZE ACCESS
                    </button>
                </form>
            </div>
        </div>
    );
};
