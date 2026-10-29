import React, { useState, useEffect, useMemo } from 'react';
import { Allocation } from '../types';
import { sessionService } from '../services/sessionService';
import { subjectService } from '../services/subjectService';
import {
  CalendarPlus,
  X,
  Clock,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocations: Allocation[];
  preSelectedAllocation?: Allocation | null;
  teacherId: string;
  onSessionCreated: () => Promise<void> | void;
}

/**
 * Parses time string like "10:00 AM", "07:30pm", or "14:30" to total minutes from midnight
 */
const timeStringToMinutes = (timeStr: string): number => {
  if (!timeStr) return 600; // default 10:00 AM
  const trimmed = timeStr.trim().toLowerCase();

  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = match12[3];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }

  return 600;
};

/**
 * Converts total minutes from midnight to "HH:mm" for input[type="time"]
 */
const minutesToTimeString = (totalMinutes: number): string => {
  const normalized = (totalMinutes + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  isOpen,
  onClose,
  allocations,
  preSelectedAllocation,
  teacherId,
  onSessionCreated
}) => {
  // Only consider Active allocations
  const activeAllocations = useMemo(() => {
    return allocations.filter(a => (a.status || 'Active').toLowerCase() === 'active');
  }, [allocations]);

  const [selectedAllocId, setSelectedAllocId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Get currently selected allocation object
  const currentAllocation = useMemo(() => {
    if (preSelectedAllocation) return preSelectedAllocation;
    return activeAllocations.find(a => a.assignId === selectedAllocId) || activeAllocations[0] || null;
  }, [preSelectedAllocation, activeAllocations, selectedAllocId]);

  // Compute default duration from allocation
  const allocDurationMinutes = useMemo(() => {
    if (!currentAllocation || !currentAllocation.startTime || !currentAllocation.endTime) {
      return 60;
    }
    const startMins = timeStringToMinutes(currentAllocation.startTime);
    const endMins = timeStringToMinutes(currentAllocation.endTime);
    let diff = endMins - startMins;
    if (diff <= 0) diff += 24 * 60;
    return diff > 0 && diff <= 300 ? diff : 60;
  }, [currentAllocation]);

  // Initialize form when opened or preSelectedAllocation changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setShowConfirm(false);

      // Default date to today in YYYY-MM-DD
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      setDate(todayStr);

      const chosen = preSelectedAllocation || activeAllocations[0] || null;
      if (chosen) {
        setSelectedAllocId(chosen.assignId);
        // Default start time from allocation or 10:00
        const defaultStartMins = chosen.startTime ? timeStringToMinutes(chosen.startTime) : 600;
        const startStr = minutesToTimeString(defaultStartMins);
        setStartTime(startStr);

        // Auto-calculate end time
        let dur = 60;
        if (chosen.startTime && chosen.endTime) {
          const s = timeStringToMinutes(chosen.startTime);
          const e = timeStringToMinutes(chosen.endTime);
          let d = e - s;
          if (d <= 0) d += 24 * 60;
          if (d > 0 && d <= 300) dur = d;
        }
        setEndTime(minutesToTimeString(defaultStartMins + dur));
      }
    }
  }, [isOpen, preSelectedAllocation, activeAllocations]);

  // Automatically update endTime whenever startTime or allocation changes
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    if (newStartTime) {
      const startMins = timeStringToMinutes(newStartTime);
      const calculatedEndMins = startMins + allocDurationMinutes;
      setEndTime(minutesToTimeString(calculatedEndMins));
    }
  };

  // When changing allocation in dropdown
  const handleAllocationChange = (assignId: string) => {
    setSelectedAllocId(assignId);
    const chosen = activeAllocations.find(a => a.assignId === assignId);
    if (chosen && chosen.startTime) {
      const sMins = timeStringToMinutes(chosen.startTime);
      setStartTime(minutesToTimeString(sMins));

      let dur = 60;
      if (chosen.startTime && chosen.endTime) {
        let d = timeStringToMinutes(chosen.endTime) - sMins;
        if (d <= 0) d += 24 * 60;
        if (d > 0 && d <= 300) dur = d;
      }
      setEndTime(minutesToTimeString(sMins + dur));
    }
  };

  if (!isOpen) return null;

  // Validate form
  const handleValidateAndPromptConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentAllocation) {
      setErrorMessage('Please select an active allocation.');
      return;
    }
    if (!date) {
      setErrorMessage('Please select a session date.');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMessage('Please specify both start and end time.');
      return;
    }

    const startMins = timeStringToMinutes(startTime);
    const endMins = timeStringToMinutes(endTime);
    let diff = endMins - startMins;
    if (diff <= 0) diff += 24 * 60;

    if (diff < 15) {
      setErrorMessage('Session duration must be at least 15 minutes.');
      return;
    }

    setShowConfirm(true);
  };

  // Perform create session
  const handleConfirmCreate = async () => {
    if (!currentAllocation) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Look up subject name from subject database based on subject ID
      const subjectName = await subjectService.getSubjectNameById(currentAllocation.subjectId);

      const res = await sessionService.createSession({
        teacherId: teacherId || currentAllocation.teacherId,
        assignId: currentAllocation.assignId,
        classRoomId: currentAllocation.classRoomId,
        subjectId: currentAllocation.subjectId,
        subjectName: subjectName || currentAllocation.subjectLabel || currentAllocation.subjectId,
        subjectLabel: currentAllocation.subjectLabel || currentAllocation.subjectId,
        studentIds: currentAllocation.studentIds || [],
        date: date,
        startTime: startTime,
        endTime: endTime,
        meetLink: currentAllocation.meetLink || '',
        sessionsPerDay: currentAllocation.sessionsPerDay || 1
      });

      if (res.success) {
        await onSessionCreated();
        onClose();
      } else {
        setShowConfirm(false);
        setErrorMessage(res.error || 'Failed to create session. Please try again.');
      }
    } catch (err: any) {
      setShowConfirm(false);
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const studentNames = currentAllocation?.studentNames && currentAllocation.studentNames.length > 0
    ? currentAllocation.studentNames.join(', ')
    : currentAllocation?.studentIds?.join(', ') || 'Assigned Students';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl md:rounded-[2rem] shadow-2xl border-2 border-slate-200 overflow-hidden relative my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-brand-navy text-white px-6 py-5 flex items-center justify-between border-b-2 border-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/20">
              <CalendarPlus size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                Add New Session
              </h3>
              <p className="text-[11px] font-bold text-slate-300">
                Schedule an extra session under active allocation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-2.5 text-xs font-black text-red-700 animate-in shake duration-300">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Allocation Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5 ml-1">
              <Layers size={13} className="text-brand-navy" />
              SELECT ALLOCATION <span className="text-red-500">*</span>
            </label>

            {preSelectedAllocation ? (
              // Preselected display card
              <div className="p-4 bg-slate-50 border-2 border-brand-navy/30 rounded-2xl flex flex-col gap-1 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 truncate">
                    {preSelectedAllocation.subjectLabel || preSelectedAllocation.subjectId}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md">
                    Selected
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-500">
                  <span>Room: {preSelectedAllocation.classRoomId}</span>
                  <span>•</span>
                  <span className="truncate max-w-[200px]">{studentNames}</span>
                </div>
              </div>
            ) : (
              // Dropdown selection
              <div className="relative">
                <select
                  value={selectedAllocId}
                  onChange={(e) => handleAllocationChange(e.target.value)}
                  disabled={isSubmitting || activeAllocations.length === 0}
                  className="w-full bg-slate-50 border-2 border-slate-300 px-4 py-3 rounded-2xl text-xs font-black text-slate-800 outline-none focus:border-brand-navy focus:bg-white transition-all appearance-none pr-10 disabled:opacity-50"
                >
                  {activeAllocations.length === 0 ? (
                    <option value="">No active allocations found</option>
                  ) : (
                    activeAllocations.map((alloc) => (
                      <option key={alloc.assignId} value={alloc.assignId}>
                        {alloc.classRoomId} — {alloc.subjectLabel || alloc.subjectId} ({alloc.studentNames?.length || alloc.studentIds?.length} Student{alloc.studentIds?.length > 1 ? 's' : ''})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Allocation Details Badge */}
          {currentAllocation && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap size={16} className="text-brand-navy shrink-0" />
                <span className="text-[11px] font-black text-brand-navy truncate">
                  {studentNames}
                </span>
              </div>
              <span className="text-[10px] font-black text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                Default: {currentAllocation.startTime || '10:00'} - {currentAllocation.endTime || '11:00'}
              </span>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5 ml-1">
              <Calendar size={13} className="text-brand-navy" />
              SESSION DATE <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-slate-50 border-2 border-slate-300 px-4 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all disabled:opacity-50"
            />
          </div>

          {/* Timings: Start Time & Auto End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5 ml-1">
                <Clock size={13} className="text-brand-navy" />
                START TIME <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 border-2 border-slate-300 px-4 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-600" />
                  END TIME
                </label>
                <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 uppercase tracking-wider">
                  Auto-Calculated
                </span>
              </div>
              <div className="w-full bg-slate-100/90 border-2 border-slate-300 px-4 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-800 flex items-center justify-between select-none cursor-not-allowed shadow-inner">
                <span className="font-mono text-sm">{endTime || '--:--'}</span>
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                  +{allocDurationMinutes} mins
                </span>
              </div>
            </div>
          </div>

          {/* Duration Indicator */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-600">
            <span>Estimated Duration:</span>
            <span className="text-brand-navy">
              {(() => {
                const s = timeStringToMinutes(startTime);
                const e = timeStringToMinutes(endTime);
                let d = e - s;
                if (d <= 0) d += 24 * 60;
                const hrs = Math.floor(d / 60);
                const mins = d % 60;
                return `${hrs > 0 ? `${hrs} hr ` : ''}${mins > 0 ? `${mins} mins` : hrs === 0 ? '0 mins' : ''}`.trim();
              })()}
            </span>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-3 rounded-2xl border-2 border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleValidateAndPromptConfirm}
              disabled={isSubmitting || !currentAllocation}
              className="px-6 py-3 rounded-2xl bg-brand-navy hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-navy/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <CalendarPlus size={16} />
              <span>Create Session</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal Overlay */}
        {showConfirm && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-50 p-6 flex flex-col justify-between animate-in fade-in duration-150">
            <div className="space-y-4 my-auto text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-brand-navy mx-auto flex items-center justify-center border-2 border-blue-200 shadow-sm">
                <CalendarPlus size={28} />
              </div>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Are you sure you want to create?
              </h4>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                A new scheduled session will be created in your Academic Queue for{' '}
                <strong className="text-slate-900">{date}</strong> from{' '}
                <strong className="text-slate-900">{startTime}</strong> to{' '}
                <strong className="text-slate-900">{endTime}</strong>.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-700 text-left space-y-1">
                <div>Classroom: <span className="text-brand-navy">{currentAllocation?.classRoomId}</span></div>
                <div>Subject: <span className="text-brand-navy">{currentAllocation?.subjectLabel || currentAllocation?.subjectId}</span></div>
                <div className="truncate">Students: <span className="text-slate-600">{studentNames}</span></div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Yes, Confirm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
