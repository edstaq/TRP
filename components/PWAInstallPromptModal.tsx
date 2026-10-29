import React from 'react';
import { X, Smartphone, Zap, Sparkles, Download, ArrowRight } from 'lucide-react';

interface PWAInstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isIOS?: boolean;
}

export const PWAInstallPromptModal: React.FC<PWAInstallPromptModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isIOS = false
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[110] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl md:rounded-[2rem] shadow-2xl border-2 border-slate-200 overflow-hidden relative my-auto animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300"
      >
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-brand-navy via-indigo-600 to-cyan-500 w-full" />

        <div className="p-6 space-y-5">
          {/* Top Bar with Icon & Close */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-navy p-2 flex items-center justify-center shadow-md border-2 border-slate-200 overflow-hidden shrink-0">
                <img
                  src="/assets/brand-logo.png"
                  alt="TRP App"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-brand-navy flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>';
                  }}
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-black uppercase tracking-wider">
                  <Sparkles size={10} /> Fast Mobile App
                </span>
                <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
                  Install TRP App
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs font-bold text-slate-600 leading-relaxed">
            Add TRP directly to your phone's home screen for quick 1-tap access and a full-screen experience.
          </p>

          {/* Benefits List */}
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2.5 text-[11px] font-extrabold text-slate-700">
              <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                <Zap size={12} strokeWidth={2.5} />
              </div>
              <span>Instant 1-tap access from home screen</span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-extrabold text-slate-700">
              <div className="w-5 h-5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                <Smartphone size={12} strokeWidth={2.5} />
              </div>
              <span>Clean full-screen mode without browser bars</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onInstall}
              className="w-full py-3.5 rounded-2xl bg-brand-navy hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-brand-navy/20 active:scale-98 flex items-center justify-center gap-2"
            >
              <Download size={16} strokeWidth={2.5} />
              <span>{isIOS ? 'How to Add to Home Screen' : 'Install App Now'}</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-extrabold text-[11px] uppercase tracking-wider transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
