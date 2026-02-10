
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingPopupProps {
    message?: string;
}

const LoadingPopup: React.FC<LoadingPopupProps> = ({ message = "Synchronizing Data..." }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-500" />
            <div className="relative bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-brand-navy/10 border-t-brand-navy rounded-full animate-spin" />
                    <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-navy animate-pulse" size={32} />
                </div>
                <div className="text-center">
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Please Wait</p>
                    <p className="text-lg font-black text-brand-navy tracking-tight">{message}</p>
                </div>
            </div>
        </div>
    );
};

export default LoadingPopup;
