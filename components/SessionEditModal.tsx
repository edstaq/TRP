
import React, { useState } from 'react';
import { Session } from '../types';
import { X, Calendar, Clock, Save } from 'lucide-react';

interface SessionEditModalProps {
  session: Session;
  onClose: () => void;
  onSave: (updatedData: { startTime: string; durationMinutes: number }) => void;
}

const SessionEditModal: React.FC<SessionEditModalProps> = ({ session, onClose, onSave }) => {
  const currentStart = new Date(session.startTime);
  const currentEnd = new Date(currentStart.getTime() + session.durationMinutes * 60000);
  
  // Format for input type="date" (YYYY-MM-DD)
  const initialDate = currentStart.toISOString().split('T')[0];
  // Format for input type="time" (HH:mm)
  const initialStartTime = currentStart.toTimeString().slice(0, 5);
  const initialEndTime = currentEnd.toTimeString().slice(0, 5);
  
  const [date, setDate] = useState(initialDate);
  const [startTimeStr, setStartTimeStr] = useState(initialStartTime);
  const [endTimeStr, setEndTimeStr] = useState(initialEndTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct date objects
    const start = new Date(`${date}T${startTimeStr}`);
    const end = new Date(`${date}T${endTimeStr}`);
    
    // Calculate duration in minutes. 
    // Handle the case where end time might be after midnight (next day)
    let diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) {
      // If end time is before or equal to start time, we assume it's for the next day
      diffMs += 24 * 60 * 60 * 1000;
    }
    
    const durationMinutes = Math.round(diffMs / 60000);
    
    onSave({ 
      startTime: start.toISOString(), 
      durationMinutes 
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-brand-navy p-8 text-white relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Reschedule Session</p>
          <h2 className="text-2xl font-black tracking-tight">{session.subject}</h2>
          <p className="text-xs font-bold opacity-80 mt-1">{session.className}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar size={12} /> Class Date
              </label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all"
              />
            </div>

            {/* Start Time Picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Clock size={12} /> Start Time
              </label>
              <input 
                type="time" 
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all"
              />
            </div>

            {/* End Time Picker (Replaces Duration Buttons) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Clock size={12} /> End Time
              </label>
              <input 
                type="time" 
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] h-14 bg-brand-navy text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-brand-navy/20 hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> Update Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionEditModal;
