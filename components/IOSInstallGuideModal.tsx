import React from 'react';
import { X, Share2, PlusSquare, Check, Sparkles } from 'lucide-react';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS?: boolean;
}

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({
  isOpen,
  onClose,
  isIOS = true
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl md:rounded-[2rem] shadow-2xl border-2 border-slate-200 overflow-hidden relative my-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-brand-navy text-white px-6 py-5 flex items-center justify-between border-b-2 border-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/20">
              <PlusSquare size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {isIOS ? 'Install on iPhone / iPad' : 'Add to Home Screen'}
              </h3>
              <p className="text-[11px] font-bold text-slate-300">
                Quick 3-step setup in Safari browser
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-black text-indigo-900">
            <Sparkles size={16} className="text-brand-navy shrink-0" />
            <span>Install TRP on your home screen for full-screen 1-tap access!</span>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
              <div className="w-7 h-7 rounded-xl bg-brand-navy text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                1
              </div>
              <div className="text-xs text-slate-800 space-y-0.5">
                <p className="font-black text-slate-900">
                  Tap the <span className="inline-flex items-center gap-1 font-black text-brand-navy bg-white px-1.5 py-0.5 rounded border border-slate-300"><Share2 size={12} /> Share</span> button
                </p>
                <p className="text-[11px] font-bold text-slate-500">
                  Located in the bottom navigation toolbar of Safari.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
              <div className="w-7 h-7 rounded-xl bg-brand-navy text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                2
              </div>
              <div className="text-xs text-slate-800 space-y-0.5">
                <p className="font-black text-slate-900">
                  Scroll down & tap <span className="inline-flex items-center gap-1 font-black text-brand-navy bg-white px-1.5 py-0.5 rounded border border-slate-300"><PlusSquare size={12} /> Add to Home Screen</span>
                </p>
                <p className="text-[11px] font-bold text-slate-500">
                  In the action list that appears.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
              <div className="w-7 h-7 rounded-xl bg-brand-navy text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                3
              </div>
              <div className="text-xs text-slate-800 space-y-0.5">
                <p className="font-black text-slate-900">
                  Tap <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">Add</span> in the top right corner
                </p>
                <p className="text-[11px] font-bold text-slate-500">
                  The TRP Teacher icon will appear on your phone home screen!
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-brand-navy hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 mt-2"
          >
            <Check size={16} strokeWidth={3} />
            <span>Got It, Thanks!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
