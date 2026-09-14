import React, { useState, useEffect, useRef } from 'react';
import { Session, Student, SessionStatus } from '../types';
import {
  Star,
  CheckCircle,
  XCircle,
  ChevronLeft,
  RefreshCcw,
  UserCheck,
  MessageSquarePlus,
  Users,
  History,
  Loader2,
  BookOpen,
  Clock,
  FileUp,
  StickyNote,
  FileText,
  Download,
  ChevronDown,
  Key,
  Check,
  ArrowRight,
  MoreVertical
} from 'lucide-react';
import { studentLogService } from '../services/studentLogService';
import { sessionService } from '../services/sessionService';

interface AttendanceSheetProps {
  session: Session;
  teacherId?: string;
  onUpdate: (updatedSession: Session) => void;
  onBack: () => void;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ session, teacherId, onUpdate, onBack }) => {
  const [students, setStudents] = useState<Student[]>(session.students);
  const [isLoading, setIsLoading] = useState(false);
  const [globalRate, setGlobalRate] = useState(0);
  const [globalComment, setGlobalComment] = useState('');
  const [topicCovered, setTopicCovered] = useState(session.topicCovered || '');
  const [startedTime, setStartedTime] = useState(session.startedTime || '');
  const [endedTime, setEndedTime] = useState(session.endedTime || '');
  const [showFiles, setShowFiles] = useState(false);
  const [isRefreshingFiles, setIsRefreshingFiles] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchExistingLogs = async () => {
      setIsLoading(true);
      try {
        const logs = await studentLogService.fetchBySessionId(session.sessionId);
        if (logs && logs.length > 0) {
          setStudents(prev => prev.map(student => {
            const log = logs.find(l => l["Student ID"] === student.id);
            if (log) {
              return {
                ...student,
                name: log["Student Name"] || student.name,
                attended: log["Status"] === 'Present',
                listeningRate: Number(log["Rating"]) || 0,
                review: log["Comment"] || ''
              };
            }
            return student;
          }));
        }
      } catch (error) {
        console.error('Failed to fetch student logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    fetchExistingLogs();
  }, [session.sessionId]);

  const isCompleted = session.status === SessionStatus.COMPLETED;

  // Format Scheduled Date & Time for Reschedule Form (Format: YYYY-MM-DD+hh:mm)
  const dt = new Date(session.startTime);
  const YYYY = dt.getFullYear();
  const MM = String(dt.getMonth() + 1).padStart(2, '0');
  const DD = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const scheduledTimeStr = `${YYYY}-${MM}-${DD}+${hh}:${mm}`;
  const dynamicRescheduleUrl = `https://docs.google.com/forms/d/e/1FAIpQLScaSDHH-sBO9_1i2FyL6qtES0o1MABTLHbGvhQNEfdXcfTJ8w/viewform?usp=pp_url&entry.1835484315=${encodeURIComponent(session.sessionId)}&entry.1523317442=${scheduledTimeStr}`;

  const toggleAttendance = (id: string) => {
    if (isCompleted) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, attended: !s.attended } : s));
  };

  const setAllAttendance = (status: boolean) => {
    if (isCompleted) return;
    setStudents(prev => prev.map(s => ({ ...s, attended: status })));
  };

  const updateRate = (id: string, rate: number) => {
    if (isCompleted) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, listeningRate: rate } : s));
  };

  const updateReview = (id: string, review: string) => {
    if (isCompleted) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, review } : s));
  };

  const applyGlobalSettings = () => {
    if (isCompleted) return;
    setStudents(prev => prev.map(s => s.attended ? {
      ...s,
      listeningRate: globalRate > 0 ? globalRate : s.listeningRate,
      review: globalComment.trim() !== '' ? globalComment : s.review
    } : s));
  };

  const handleRefreshFiles = async () => {
    setIsRefreshingFiles(true);
    try {
      const targetTeacherId = teacherId || session.id.split('_')[0];
      if (targetTeacherId) {
        const sessions = await sessionService.fetchByTeacherId(targetTeacherId);
        const updatedSession = sessions.find(s => s.sessionId === session.sessionId);
        if (updatedSession) {
          onUpdate({ ...session, files: updatedSession.files });
        }
      }
    } catch (error) {
      console.error('Failed to refresh files:', error);
    } finally {
      setIsRefreshingFiles(false);
    }
  };

  const handleSave = async () => {
    if (isCompleted) {
      onBack();
      return;
    }

    // Validation
    if (!startedTime || !endedTime) {
      alert('Please enter both Started Time and Ended Time.');
      return;
    }

    if (!topicCovered.trim()) {
      alert('Please enter the Topic Covered.');
      return;
    }

    const presentStudents = students.filter(s => s.attended);

    if (presentStudents.length === 0) {
      alert('Please mark at least one student as present.');
      return;
    }

    const unratedStudents = presentStudents.filter(s => s.listeningRate === 0);

    if (unratedStudents.length > 0) {
      alert(`Please provide a rating for all present students. Missing ratings for: ${unratedStudents.map(s => s.name).join(', ')}`);
      return;
    }

    const sessionFiles = session.files || [];

    // Check for Session Proof
    const hasSessionProof = sessionFiles.some(f => f.type === 'Session Proof');
    if (!hasSessionProof) {
      alert('Please upload a Session Proof before saving the record.');
      return;
    }

    // Check for Learning Material
    const hasLearnDocs = sessionFiles.some(f => f.type === 'Learn Docs');
    if (!hasLearnDocs) {
      alert('Please upload at least one Learning Material before saving the record.');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare bulk logs for API
      const logsToSave = students.map(s => ({
        sessionId: session.sessionId,
        studentId: s.id,
        status: s.attended ? 'Present' : 'Absent',
        rating: s.attended ? s.listeningRate : 0,
        comment: s.review || ''
      }));

      const success = await studentLogService.bulkAdd(logsToSave);
      if (!success) {
        throw new Error('Failed to save student logs');
      }

      // Update session details
      const sessionUpdates: any = {};

      if (topicCovered !== session.topicCovered) {
        sessionUpdates["Topic covered"] = topicCovered;
      }
      if (startedTime !== session.startedTime) {
        sessionUpdates["Started Time"] = startedTime;
      }
      if (endedTime !== session.endedTime) {
        sessionUpdates["Ended Time"] = endedTime;
      }

      if (Object.keys(sessionUpdates).length > 0) {
        await sessionService.updateSession(session.sessionId, sessionUpdates);
      }

      onUpdate({ ...session, students, topicCovered, startedTime, endedTime });
      onBack();
    } catch (error) {
      console.error('Error saving session records:', error);
      alert('Failed to save session records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const setTimeNow = (setter: (val: string) => void) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setter(timeStr);
  };

  const sessionFiles = session.files || [];
  const sessionProofFile = sessionFiles.find(f => f.type === 'Session Proof');
  const hasSessionProof = !!sessionProofFile;
  const learnDocs = sessionFiles.filter(f => f.type === 'Learn Docs');
  const proofUploadUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfuXQXs-skxQtBjNBgswKv3SmidM5D31u0mIEFpXbQzPFu6fA/viewform?usp=pp_url&entry.150359841=${encodeURIComponent(session.sessionId)}&entry.47705791=Session+Proof&entry.579457268=Screenshot`;
  const learnDocsUploadUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfuXQXs-skxQtBjNBgswKv3SmidM5D31u0mIEFpXbQzPFu6fA/viewform?usp=pp_url&entry.150359841=${encodeURIComponent(session.sessionId)}&entry.47705791=Learn+Docs&entry.579457268=`;

  const hasMultipleStudents = students.length > 1;

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 md:relative bg-slate-900/20 md:bg-transparent z-[60] overflow-y-auto custom-scrollbar animate-in slide-in-from-right-full md:slide-in-from-bottom-4 duration-500"
    >
      <div className="min-h-full flex flex-col bg-slate-100 md:rounded-[2.5rem] md:shadow-2xl md:shadow-slate-900/15 md:border-2 md:border-slate-200 overflow-hidden">

        {/* Sticky High-Contrast Header */}
        <header className="sticky top-0 z-30 bg-white border-b-2 border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-brand-navy hover:text-white text-slate-700 transition-all border border-slate-200 flex items-center justify-center shadow-sm shrink-0 active:scale-95"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                  {isCompleted ? 'Historical Record' : 'Session Dashboard'}
                </h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session.sessionId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl transition-all active:scale-95 group shadow-sm shrink-0"
                  title="Click to copy Session ID"
                >
                  {copiedId ? <Check size={12} className="text-emerald-600" /> : <Key size={12} className="text-slate-500 group-hover:text-brand-navy" />}
                  <span className="text-[10px] sm:text-[11px] font-black font-mono tracking-widest text-brand-navy">
                    {copiedId ? 'COPIED!' : session.sessionId}
                  </span>
                </button>
              </div>
              <p className="text-[10px] sm:text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mt-0.5 truncate">
                {session.className} <span className="mx-1 text-slate-400">•</span> {session.subject}
              </p>
            </div>
          </div>

          {!isCompleted && (
            <div className="relative shrink-0 self-end sm:self-center" ref={optionsMenuRef}>
              <button
                type="button"
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-brand-navy border-2 border-slate-300 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                title="Session Options"
              >
                <MoreVertical size={20} />
              </button>

              {showOptionsMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <a
                    href={dynamicRescheduleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowOptionsMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-800 hover:bg-slate-100 hover:text-brand-navy rounded-xl transition-all group"
                  >
                    <RefreshCcw size={16} className="text-slate-500 group-hover:text-brand-navy group-hover:rotate-180 transition-all duration-500 shrink-0" />
                    <span className="uppercase tracking-wider">Reschedule Session</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Content Body with Soft Slate Canvas Background */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-full overflow-x-hidden relative bg-slate-100/90">
          {isLoading && !isCompleted && (
            <div className="absolute inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center rounded-[2.5rem]">
              <div className="flex flex-col items-center gap-3 p-8 bg-white rounded-3xl shadow-2xl border-2 border-slate-300">
                <Loader2 size={36} className="text-brand-navy animate-spin" />
                <p className="text-xs font-black text-brand-navy uppercase tracking-widest">Syncing Records...</p>
              </div>
            </div>
          )}

          {/* Section 1: Session Timing & Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timing Card */}
            <div className="bg-white border-2 border-slate-200/90 p-6 rounded-3xl shadow-md hover:shadow-lg transition-all space-y-4 border-t-4 border-t-brand-navy">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-navy text-white flex items-center justify-center shadow-sm">
                    <Clock size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">SESSION TIMINGS</h3>
                </div>
                <span className="text-[10px] font-extrabold text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200 uppercase tracking-wider">Required *</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Started At */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider pl-1">STARTED AT</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={startedTime}
                      onChange={(e) => setStartedTime(e.target.value)}
                      disabled={isCompleted}
                      className="flex-1 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all disabled:opacity-60 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setTimeNow(setStartedTime)}
                      disabled={isCompleted}
                      className="h-12 w-12 shrink-0 bg-slate-100 border-2 border-slate-300 hover:bg-brand-navy hover:text-white hover:border-brand-navy rounded-2xl flex items-center justify-center text-slate-700 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                      title="Set to Current Time"
                    >
                      <Clock size={18} />
                    </button>
                  </div>
                </div>

                {/* Ended At */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider pl-1">ENDED AT</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={endedTime}
                      onChange={(e) => setEndedTime(e.target.value)}
                      disabled={isCompleted}
                      className="flex-1 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all disabled:opacity-60 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setTimeNow(setEndedTime)}
                      disabled={isCompleted}
                      className="h-12 w-12 shrink-0 bg-slate-100 border-2 border-slate-300 hover:bg-brand-navy hover:text-white hover:border-brand-navy rounded-2xl flex items-center justify-center text-slate-700 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                      title="Set to Current Time"
                    >
                      <Clock size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Topic Covered Card */}
            <div className="bg-white border-2 border-slate-200/90 p-6 rounded-3xl shadow-md hover:shadow-lg transition-all space-y-4 border-t-4 border-t-brand-navy">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-navy text-white flex items-center justify-center shadow-sm">
                    <BookOpen size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">TOPIC COVERED</h3>
                </div>
                <span className="text-[10px] font-extrabold text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200 uppercase tracking-wider">Required *</span>
              </div>

              <textarea
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                disabled={isCompleted}
                placeholder="Enter topic details (e.g., Chapter 4: Algebraic Fractions & Practice Questions)..."
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 text-sm font-black text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-navy focus:bg-white transition-all min-h-[96px] resize-none disabled:opacity-60 shadow-inner"
              />
            </div>
          </div>

          {/* Section 2: Uploads & Learning Materials */}
          <div className="bg-white border-2 border-slate-200/90 rounded-3xl shadow-md p-6 space-y-6 border-t-4 border-t-blue-600">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <FileUp size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">VERIFICATION & LEARNING MATERIALS</h3>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Session proofs and teaching notes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshFiles}
                className={`p-2.5 px-4 rounded-xl border-2 border-slate-200 flex items-center gap-2 text-xs font-black text-slate-800 hover:bg-slate-100 transition-all active:scale-95 shadow-sm ${
                  isRefreshingFiles ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white'
                }`}
                title="Refresh uploaded files list"
              >
                <RefreshCcw size={14} className={isRefreshingFiles ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh Files</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Session Proof Upload Button */}
              <a
                href={hasSessionProof ? sessionProofFile.uploadFile : proofUploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`group border-2 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-all ${
                  hasSessionProof
                    ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/70'
                    : 'bg-slate-50 border-slate-300 hover:border-orange-400 hover:bg-orange-50/50 hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  hasSessionProof
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-white border-orange-300 text-orange-600 shadow-sm'
                }`}>
                  {hasSessionProof ? <CheckCircle size={24} /> : <FileUp size={24} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-black uppercase tracking-wider ${hasSessionProof ? 'text-emerald-900' : 'text-slate-900 group-hover:text-orange-600'}`}>
                      {hasSessionProof ? 'Proof Verified' : 'Session Proof'}
                    </h4>
                    {!hasSessionProof && <span className="text-[9px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-200">Required</span>}
                  </div>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mt-0.5 truncate">
                    {hasSessionProof ? 'Tap to view screenshot' : 'Upload screenshot proof'}
                  </p>
                </div>
                <ArrowRight size={18} className={`shrink-0 transition-transform group-hover:translate-x-1 ${hasSessionProof ? 'text-emerald-700' : 'text-slate-400 group-hover:text-orange-600'}`} />
              </a>

              {/* Learning Material Upload Button */}
              <a
                href={learnDocsUploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group border-2 border-slate-300 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-400 p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-all hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border-2 border-blue-300 text-blue-600 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  <StickyNote size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-700 uppercase tracking-wider">Learning Material</h4>
                    <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">Required</span>
                  </div>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mt-0.5 truncate">
                    Upload notes or worksheets
                  </p>
                </div>
                <ArrowRight size={18} className="shrink-0 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            {/* Uploaded Documents List */}
            {learnDocs.length > 0 ? (
              <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowFiles(!showFiles)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-100 transition-colors border-b border-slate-200"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={18} className="text-brand-navy" />
                    <span className="text-xs font-black text-slate-900">Uploaded Documents</span>
                    <span className="px-2.5 py-0.5 bg-brand-navy text-white rounded-full text-[10px] font-black">
                      {learnDocs.length}
                    </span>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-slate-600 transition-transform duration-300 ${showFiles ? 'rotate-180' : ''}`}
                  />
                </button>

                {showFiles && (
                  <div className="p-4 space-y-2 border-t border-slate-200 bg-white">
                    {learnDocs.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.uploadFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText size={20} className="text-blue-600 shrink-0" />
                          <span className="text-xs font-black text-slate-900 truncate">{file.fileName}</span>
                        </div>
                        <Download size={18} className="text-slate-500 group-hover:text-blue-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Section 3: Bulk Actions (ONLY DISPLAYED IF MULTIPLE STUDENTS EXIST) */}
          {!isCompleted && hasMultipleStudents && (
            <div className="bg-white border-2 border-slate-200/90 p-6 rounded-3xl shadow-md space-y-5 animate-in fade-in duration-300 border-t-4 border-t-purple-600">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                    <Users size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">BULK ACTIONS & GLOBAL SETTINGS</h3>
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Quickly apply ratings or notes to all students</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                {/* Mark All Status */}
                <div className="lg:col-span-3 space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">MARK ATTENDANCE</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAllAttendance(true)}
                      className="flex-1 h-11 rounded-2xl bg-emerald-100 text-emerald-900 border-2 border-emerald-300 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-200 transition-all active:scale-95 shadow-sm"
                    >
                      ALL PRESENT
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllAttendance(false)}
                      className="flex-1 h-11 rounded-2xl bg-slate-100 text-slate-700 border-2 border-slate-300 text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                    >
                      ALL ABSENT
                    </button>
                  </div>
                </div>

                {/* Bulk Rating */}
                <div className="lg:col-span-4 space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">GLOBAL STAR RATING</label>
                  <div className="flex gap-1.5 p-1 bg-slate-50 border-2 border-slate-300 rounded-2xl shadow-inner">
                    {[1, 2, 3, 4, 5].map(star => {
                      const isSelected = globalRate >= star;
                      return (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setGlobalRate(star)}
                          className={`flex-1 h-9 rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-amber-400 text-amber-950 font-black shadow-md'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200/60'
                          }`}
                          title={`Global Rate ${star} Star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={16}
                            className={isSelected ? 'text-amber-950 fill-amber-950' : 'text-slate-400 fill-slate-100'}
                            strokeWidth={2}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bulk Comment */}
                <div className="lg:col-span-5 space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">GLOBAL OBSERVATION NOTE</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={globalComment}
                      onChange={(e) => setGlobalComment(e.target.value)}
                      placeholder="Observation note for present students..."
                      className="flex-1 bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 text-xs font-black text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-navy focus:bg-white transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={applyGlobalSettings}
                      className="h-11 px-6 rounded-2xl bg-brand-navy text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-md shrink-0"
                    >
                      APPLY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Student Attendance Roll */}
          <div className="bg-white border-2 border-slate-200/90 rounded-3xl shadow-md overflow-hidden border-t-4 border-t-brand-navy">
            <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-navy text-white flex items-center justify-center shadow-sm">
                  <UserCheck size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">STUDENT ATTENDANCE & EVALUATION</h3>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Mark attendance, rate engagement, and add notes</p>
                </div>
              </div>

              {/* Presence Pill */}
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">PRESENT:</span>
                <span className="text-xs font-black text-brand-navy">
                  {students.filter(s => s.attended).length} / {students.length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">STUDENT</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center">ATTENDANCE STATUS</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">RATING <span className="text-red-600">*</span></th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest w-[38%]">OBSERVATIONS & FEEDBACK</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className={`transition-colors ${student.attended ? 'bg-white' : 'bg-slate-50'}`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-sm ${
                            student.attended
                              ? (isCompleted ? 'bg-slate-300 text-slate-700' : 'bg-brand-navy text-white')
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-black tracking-tight text-base ${student.attended ? 'text-slate-900' : 'text-slate-500'}`}>{student.name}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5">ID: {student.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAttendance(student.id)}
                          disabled={isCompleted}
                          className={`inline-flex h-10 px-5 rounded-2xl items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                            student.attended
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          } ${!isCompleted ? 'hover:scale-105 active:scale-95' : ''}`}
                        >
                          {student.attended ? <CheckCircle size={15} /> : <XCircle size={15} />}
                          {student.attended ? 'PRESENT' : 'ABSENT'}
                        </button>
                      </td>

                      <td className="px-6 py-5">
                        <div className={`flex items-center gap-3 transition-opacity ${student.attended ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                          <div className="flex items-center gap-1 bg-slate-50 border-2 border-slate-300 px-2.5 py-1.5 rounded-2xl shadow-inner">
                            {[1, 2, 3, 4, 5].map(star => {
                              const isSelected = student.listeningRate >= star;
                              return (
                                <button
                                  type="button"
                                  key={star}
                                  onClick={() => updateRate(student.id, star)}
                                  disabled={isCompleted}
                                  className={`p-1 rounded-lg transition-all ${!isCompleted ? 'hover:scale-125 active:scale-95' : ''}`}
                                  title={`Rate ${star} Star${star > 1 ? 's' : ''}`}
                                >
                                  <Star
                                    size={20}
                                    className={
                                      isSelected
                                        ? 'text-amber-500 fill-amber-400 drop-shadow-sm'
                                        : 'text-slate-400 fill-slate-100 hover:text-amber-400'
                                    }
                                    strokeWidth={2}
                                  />
                                </button>
                              );
                            })}
                          </div>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-wider shrink-0 border ${
                            student.listeningRate > 0
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {student.listeningRate > 0 ? `${student.listeningRate} / 5 ★` : 'Required *'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className={`transition-opacity ${student.attended ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                          <input
                            type="text"
                            value={student.review}
                            onChange={(e) => updateReview(student.id, e.target.value)}
                            disabled={isCompleted}
                            placeholder="Add specific observation or feedback..."
                            className="w-full bg-slate-50 border-2 border-slate-300 px-4 py-3 rounded-2xl text-xs font-black text-slate-900 outline-none focus:border-brand-navy focus:bg-white placeholder:text-slate-400 transition-all disabled:opacity-70 shadow-inner"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Action Bar: Primary Save / Close Record Button */}
          <div className="flex justify-end pt-4 pb-8">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`w-full sm:w-auto font-black text-sm uppercase tracking-widest px-8 sm:px-10 py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                isCompleted
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-2 border-slate-300'
                  : 'bg-brand-navy text-white hover:bg-slate-900 shadow-brand-navy/30 hover:shadow-2xl'
              }`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isCompleted ? 'CLOSE RECORD' : 'SAVE RECORD'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheet;
