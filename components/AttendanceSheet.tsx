import React, { useState, useRef, useEffect } from 'react';
import { Session, Student, SessionStatus } from '../types';
import {
  ChevronLeft, Clock, BookOpen, CheckCircle, XCircle, Star, FileUp, ExternalLink, Loader2, Lock, Key, Check, RefreshCcw, StickyNote, AlertTriangle, FileText
} from 'lucide-react';
import { studentLogService } from '../services/studentLogService';
import { sessionService } from '../services/sessionService';

// In-memory cache for session student logs to prevent redundant network fetches
const sessionLogsCache: Record<string, Student[]> = {};

interface AttendanceSheetProps {
  session: Session;
  teacherId?: string;
  onBack: () => void;
  onUpdate: (updatedSession: Session) => void;
  onUpdateFiles?: (files: Session['files']) => void;
  isCompleted?: boolean;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  session,
  teacherId,
  onBack,
  onUpdate,
  onUpdateFiles,
  isCompleted: isCompletedProp = false
}) => {
  const isCompleted = isCompletedProp || session.status === SessionStatus.COMPLETED;
  const [startedTime, setStartedTime] = useState(session.startedTime || '');
  const [endedTime, setEndedTime] = useState(session.endedTime || '');
  const [topicCovered, setTopicCovered] = useState(session.topicCovered || '');
  const [students, setStudents] = useState<Student[]>(() => sessionLogsCache[session.sessionId] || session.students || []);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isRefreshingFiles, setIsRefreshingFiles] = useState(false);
  const [currentFiles, setCurrentFiles] = useState(session.files || []);

  useEffect(() => {
    setCurrentFiles(session.files || []);
  }, [session.files]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setStartedTime(session.startedTime || '');
    setEndedTime(session.endedTime || '');
    setTopicCovered(session.topicCovered || '');
    if (sessionLogsCache[session.sessionId]) {
      setStudents(sessionLogsCache[session.sessionId]);
    } else {
      setStudents(session.students || []);
    }
  }, [session.sessionId]);

  // Fetch real-time student logs for this session if not cached
  useEffect(() => {
    let isMounted = true;

    const loadStudentLogs = async () => {
      if (!session.sessionId) return;

      // If already in memory cache, we have the latest
      if (sessionLogsCache[session.sessionId]) {
        setStudents(sessionLogsCache[session.sessionId]);
        return;
      }

      setIsLoadingLogs(true);
      try {
        const logs = await studentLogService.fetchBySessionId(session.sessionId);
        if (!isMounted) return;

        if (logs && logs.length > 0) {
          // Map logs by Student ID (use latest if multiple entries exist)
          const logMap = new Map<string, typeof logs[0]>();
          logs.forEach(log => {
            if (log["Student ID"]) {
              logMap.set(String(log["Student ID"]).trim(), log);
            }
          });

          const baseStudents = session.students || [];
          const updated = baseStudents.map(student => {
            const matchedLog = logMap.get(String(student.id).trim());
            if (matchedLog) {
              const statusStr = (matchedLog.Status || '').trim().toLowerCase();
              const isPresent = statusStr === 'present';
              const parsedRating = typeof matchedLog.Rating === 'number'
                ? matchedLog.Rating
                : parseInt(String(matchedLog.Rating), 10) || 0;
              return {
                ...student,
                attended: isPresent,
                listeningRate: parsedRating,
                review: matchedLog.Comment || ''
              };
            }
            return student;
          });

          sessionLogsCache[session.sessionId] = updated;
          setStudents(updated);
        }
      } catch (err) {
        console.error('Failed to fetch student logs for session:', err);
      } finally {
        if (isMounted) {
          setIsLoadingLogs(false);
        }
      }
    };

    loadStudentLogs();

    return () => {
      isMounted = false;
    };
  }, [session.sessionId]);

  const sessionFiles = currentFiles;
  const sessionProofFile = sessionFiles.find(f => f.type === 'Session Proof' || (f.name && (f.name.toLowerCase().includes('proof') || f.name.toLowerCase().includes('screenshot'))));
  const hasSessionProof = !!sessionProofFile;
  const learnDocs = sessionFiles.filter(f => f.type === 'Learn Docs' || (f.name && (f.name.toLowerCase().includes('material') || f.name.toLowerCase().includes('doc'))));
  const hasLearnDocs = learnDocs.length >= 1;

  // Key Unlock Condition: User must attach at least 1 Session Proof AND at least 1 Learn Doc (or session is already completed)
  const isUnlocked = isCompleted || (hasSessionProof && hasLearnDocs);

  const toggleAttendance = (id: string) => {
    if (isCompleted || !isUnlocked) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, attended: !s.attended } : s));
  };

  const setAllAttendance = (status: boolean) => {
    if (isCompleted || !isUnlocked) return;
    setStudents(prev => prev.map(s => ({ ...s, attended: status })));
  };

  const updateRate = (id: string, rate: number) => {
    if (isCompleted || !isUnlocked) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, listeningRate: rate } : s));
  };

  const updateReview = (id: string, review: string) => {
    if (isCompleted || !isUnlocked) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, review } : s));
  };

  const handleRefreshFiles = async () => {
    setIsRefreshingFiles(true);
    try {
      const targetTeacherId = teacherId || session.id.split('_')[0];
      if (targetTeacherId) {
        const fetchedSessions = await sessionService.fetchByTeacherId(targetTeacherId);
        const updatedSession = fetchedSessions.find(s => s.sessionId === session.sessionId);
        if (updatedSession) {
          const freshFiles = updatedSession.files || [];
          setCurrentFiles(freshFiles);
          if (onUpdateFiles) {
            onUpdateFiles(freshFiles);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh files:', error);
    } finally {
      setIsRefreshingFiles(false);
    }
  };

  const setTimeNow = (setter: (val: string) => void) => {
    if (isCompleted || !isUnlocked) return;
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    setter(timeStr);
  };

  const proofUploadUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfuXQXs-skxQtBjNBgswKv3SmidM5D31u0mIEFpXbQzPFu6fA/viewform?usp=pp_url&entry.150359841=' + encodeURIComponent(session.sessionId) + '&entry.47705791=Session+Proof&entry.579457268=Screenshot';
  const learnDocsUploadUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfuXQXs-skxQtBjNBgswKv3SmidM5D31u0mIEFpXbQzPFu6fA/viewform?usp=pp_url&entry.150359841=' + encodeURIComponent(session.sessionId) + '&entry.47705791=Learn+Docs&entry.579457268=';

  const handleSave = async () => {
    if (isCompleted) {
      onBack();
      return;
    }

    if (!isUnlocked) {
      alert('Please upload both Session Proof and at least one Learning Material document first, then click Refresh Files to unlock.');
      return;
    }

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
      alert('Please provide a rating for all present students. Missing ratings for: ' + unratedStudents.map(s => s.name).join(', '));
      return;
    }

    setIsLoading(true);
    try {
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

      // Update in-memory cache so reopening immediately reflects saved values
      sessionLogsCache[session.sessionId] = students;

      const sessionUpdates: any = {};

      if (topicCovered !== session.topicCovered) {
        sessionUpdates['Topic covered'] = topicCovered;
      }
      if (startedTime !== session.startedTime) {
        sessionUpdates['Started Time'] = startedTime;
      }
      if (endedTime !== session.endedTime) {
        sessionUpdates['Ended Time'] = endedTime;
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

      return (
    <div
      ref={scrollRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onBack();
        }
      }}
      className="fixed inset-0 md:left-64 bg-slate-900/40 backdrop-blur-xs z-[50] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-4 duration-300 p-3 sm:p-6 md:p-8 flex justify-center items-start md:items-center cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl my-auto flex flex-col bg-slate-100 rounded-3xl md:rounded-[2.5rem] shadow-2xl border-2 border-slate-200 overflow-hidden cursor-default"
      >

        {/* Top Header */}
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

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300 px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm">
                <CheckCircle size={14} className="text-blue-600" />
                <span>COMPLETED RECORD</span>
              </span>
            ) : isUnlocked ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>FORM UNLOCKED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm animate-pulse">
                <Lock size={14} className="text-amber-700" />
                <span>UPLOADS REQUIRED TO UNLOCK</span>
              </span>
            )}
          </div>
        </header>

        {/* Form Body */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">

          {/* SECTION 1 (TOP): Verification & Learning Materials (Gating Section) */}
          <div className="bg-white border-2 border-slate-200/90 rounded-3xl shadow-md p-6 space-y-6 border-t-4 border-t-blue-600">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <FileUp size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">1. VERIFICATION & LEARNING MATERIALS</h3>
                    <span className="text-[10px] font-black text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200 uppercase tracking-wider">Required First</span>
                  </div>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5">
                    Upload 1 session proof & at least 1 learning material document to unlock session details and attendance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshFiles}
                disabled={isRefreshingFiles}
                className="w-full sm:w-auto p-2.5 px-4 rounded-xl border-2 border-slate-200 flex items-center justify-center gap-2 text-xs font-black text-slate-800 hover:bg-slate-100 transition-all active:scale-95 shadow-sm disabled:opacity-50 shrink-0 bg-slate-50"
              >
                <RefreshCcw size={14} className={isRefreshingFiles ? 'animate-spin text-brand-navy' : 'text-slate-600'} />
                <span>{isRefreshingFiles ? 'Refreshing Files...' : 'Refresh Files'}</span>
              </button>
            </div>

            {/* Document Upload Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Slot 1: Session Proof (Requires 1 Document) */}
              {hasSessionProof ? (
                <div className="border-2 border-emerald-200 p-4 rounded-2xl bg-emerald-50/40 flex flex-col justify-between space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileUp size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Session Proof</h4>
                        <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Screenshot proof (1 File)</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle size={12} className="text-emerald-600" /> Attached
                    </span>
                  </div>
                  {sessionProofFile && (
                    <a
                      href={sessionProofFile.uploadFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-white border border-emerald-200 rounded-xl text-xs font-black text-brand-navy hover:bg-emerald-50 transition-all group"
                    >
                      <span className="truncate max-w-[200px]">{sessionProofFile.name || 'Session Proof Screenshot'}</span>
                      <ExternalLink size={14} className="text-slate-400 group-hover:text-brand-navy shrink-0" />
                    </a>
                  )}
                </div>
              ) : (
                <a
                  href={proofUploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-dashed border-slate-300 hover:border-brand-navy p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/60 transition-all flex flex-col justify-between space-y-4 group cursor-pointer shadow-xs hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 group-hover:bg-blue-100 group-hover:text-brand-navy flex items-center justify-center shrink-0 transition-colors">
                        <FileUp size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 group-hover:text-brand-navy transition-colors">
                          Session Proof
                        </h4>
                        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Screenshot proof (1 File)</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider">
                      Required *
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-brand-navy text-xs font-black uppercase tracking-wider pt-2.5 border-t border-slate-200/80 group-hover:border-blue-200 group-hover:text-blue-700">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <FileUp size={14} /> Click to Upload Proof
                    </span>
                    <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </a>
              )}

              {/* Slot 2: Learning Materials / Learn Docs (Requires At Least 1 Document) */}
              {hasLearnDocs ? (
                <div className="border-2 border-blue-200 p-4 rounded-2xl bg-blue-50/40 flex flex-col justify-between space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Learning Materials</h4>
                        <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">{learnDocs.length} Document(s) Attached</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle size={12} className="text-blue-600" /> Attached
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {learnDocs.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.uploadFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 bg-white border border-blue-200 rounded-xl text-xs font-black text-brand-navy hover:bg-blue-50 transition-all group"
                      >
                        <span className="truncate max-w-[200px]">{doc.name || ('Learning Doc ' + (idx + 1))}</span>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-brand-navy shrink-0" />
                      </a>
                    ))}
                    {!isCompleted && (
                      <a
                        href={learnDocsUploadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 p-2 bg-white border border-dashed border-blue-300 text-brand-navy rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-blue-50 transition-colors"
                      >
                        <FileUp size={12} /> Add More Documents
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <a
                  href={learnDocsUploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-dashed border-slate-300 hover:border-brand-navy p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/60 transition-all flex flex-col justify-between space-y-4 group cursor-pointer shadow-xs hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 group-hover:bg-blue-100 group-hover:text-brand-navy flex items-center justify-center shrink-0 transition-colors">
                        <FileText size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 group-hover:text-brand-navy transition-colors">
                          Learning Materials
                        </h4>
                        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Teaching notes / docs (Min 1 File)</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider">
                      Required (Min 1) *
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-brand-navy text-xs font-black uppercase tracking-wider pt-2.5 border-t border-slate-200/80 group-hover:border-blue-200 group-hover:text-blue-700">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <FileUp size={14} /> Click to Upload Materials
                    </span>
                    <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </a>
              )}
            </div>
          </div>
          {/* SECTION 2: Session Timings */}
          <div className={'bg-white border-2 border-slate-200/90 rounded-3xl shadow-md p-6 space-y-4 border-t-4 border-t-brand-navy transition-all ' + (!isUnlocked ? 'opacity-40 pointer-events-none' : '')}>
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-brand-navy text-white flex items-center justify-center shadow-md shrink-0">
                  <Clock size={18} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">2. SESSION TIMINGS</h3>
              </div>
              {!isUnlocked && (
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Lock size={12} /> Locked
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">
                  STARTED TIME (HH:MM) <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={startedTime}
                    onChange={(e) => setStartedTime(e.target.value)}
                    disabled={isCompleted || !isUnlocked}
                    className="flex-1 bg-slate-50 border-2 border-slate-300 px-4 py-3 rounded-2xl text-sm font-black text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all disabled:opacity-70 shadow-inner"
                  />
                  {!isCompleted && isUnlocked && (
                    <button
                      type="button"
                      onClick={() => setTimeNow(setStartedTime)}
                      className="px-3 py-2 bg-slate-200 hover:bg-brand-navy hover:text-white text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-300 active:scale-95 shrink-0"
                    >
                      NOW
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">
                  ENDED TIME (HH:MM) <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={endedTime}
                    onChange={(e) => setEndedTime(e.target.value)}
                    disabled={isCompleted || !isUnlocked}
                    className="flex-1 bg-slate-50 border-2 border-slate-300 px-4 py-3 rounded-2xl text-sm font-black text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all disabled:opacity-70 shadow-inner"
                  />
                  {!isCompleted && isUnlocked && (
                    <button
                      type="button"
                      onClick={() => setTimeNow(setEndedTime)}
                      className="px-3 py-2 bg-slate-200 hover:bg-brand-navy hover:text-white text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-300 active:scale-95 shrink-0"
                    >
                      NOW
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Topic Covered */}
          <div className={'bg-white border-2 border-slate-200/90 rounded-3xl shadow-md p-6 space-y-4 border-t-4 border-t-brand-navy transition-all ' + (!isUnlocked ? 'opacity-40 pointer-events-none' : '')}>
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-brand-navy text-white flex items-center justify-center shadow-md shrink-0">
                  <BookOpen size={18} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">3. TOPIC COVERED</h3>
              </div>
              {!isUnlocked && (
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Lock size={12} /> Locked
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">
                CLASS CURRICULUM & SUMMARY <span className="text-red-600">*</span>
              </label>
              <textarea
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                disabled={isCompleted || !isUnlocked}
                rows={3}
                placeholder="Describe key concepts, sub-topics, exercises, or lab work completed during this session..."
                className="w-full bg-slate-50 border-2 border-slate-300 p-4 rounded-2xl text-xs sm:text-sm font-black text-slate-900 outline-none focus:border-brand-navy focus:bg-white placeholder:text-slate-400 transition-all disabled:opacity-70 shadow-inner"
              />
            </div>
          </div>

          {/* SECTION 4: Student Attendance & Feedback */}
          <div className={'bg-white border-2 border-slate-200/90 rounded-3xl shadow-md p-6 space-y-6 border-t-4 border-t-brand-navy transition-all ' + (!isUnlocked ? 'opacity-40 pointer-events-none' : '')}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">4. STUDENT ATTENDANCE & FEEDBACK</h3>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5">
                  Mark student attendance and rate participation (1-5 stars)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-white border-2 border-slate-300 p-1.5 rounded-2xl shadow-sm">
                  <button
                    type="button"
                    onClick={() => setAllAttendance(true)}
                    disabled={isCompleted || !isUnlocked}
                    className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
                  >
                    ALL PRESENT
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllAttendance(false)}
                    disabled={isCompleted || !isUnlocked}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
                  >
                    ALL ABSENT
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 border-2 border-slate-300 px-4 py-2 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">PRESENT:</span>
                  <span className="text-xs font-black text-brand-navy flex items-center gap-1.5">
                    {isLoadingLogs ? (
                      <Loader2 size={13} className="animate-spin text-brand-navy" />
                    ) : (
                      `${students.filter(s => s.attended).length} / ${students.length}`
                    )}
                  </span>
                </div>
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="py-14 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500 shadow-inner">
                <Loader2 size={30} className="animate-spin text-brand-navy" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Retrieving student attendance & logs...
                </p>
              </div>
            ) : (
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
                      className={'transition-colors ' + (student.attended ? 'bg-white' : 'bg-slate-50')}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={'w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-sm ' + (
                            student.attended
                              ? (isCompleted ? 'bg-slate-300 text-slate-700' : 'bg-brand-navy text-white')
                              : 'bg-slate-200 text-slate-500'
                          )}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className={'font-black tracking-tight text-base ' + (student.attended ? 'text-slate-900' : 'text-slate-500')}>{student.name}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5">ID: {student.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAttendance(student.id)}
                          disabled={isCompleted || !isUnlocked}
                          className={'inline-flex h-10 px-5 rounded-2xl items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all border-2 ' + (
                            student.attended
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          ) + (!isCompleted && isUnlocked ? ' hover:scale-105 active:scale-95' : '')}
                        >
                          {student.attended ? <CheckCircle size={15} /> : <XCircle size={15} />}
                          {student.attended ? 'PRESENT' : 'ABSENT'}
                        </button>
                      </td>

                      <td className="px-6 py-5">
                        <div className={'flex items-center gap-3 transition-opacity ' + (student.attended ? 'opacity-100' : 'opacity-30 pointer-events-none')}>
                          <div className="flex items-center gap-1 bg-slate-50 border-2 border-slate-300 px-2.5 py-1.5 rounded-2xl shadow-inner">
                            {[1, 2, 3, 4, 5].map(star => {
                              const isSelected = student.listeningRate >= star;
                              return (
                                <button
                                  type="button"
                                  key={star}
                                  onClick={() => updateRate(student.id, star)}
                                  disabled={isCompleted || !isUnlocked}
                                  className={'p-1 rounded-lg transition-all ' + (!isCompleted && isUnlocked ? 'hover:scale-125 active:scale-95' : '')}
                                  title={'Rate ' + star + ' Star' + (star > 1 ? 's' : '')}
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
                          <span className={'text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-wider shrink-0 border ' + (
                            student.listeningRate > 0
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-red-50 text-red-600 border-red-200'
                          )}>
                            {student.listeningRate > 0 ? (student.listeningRate + ' / 5 ★') : 'Required *'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className={'transition-opacity ' + (student.attended ? 'opacity-100' : 'opacity-30 pointer-events-none')}>
                          <input
                            type="text"
                            value={student.review}
                            onChange={(e) => updateReview(student.id, e.target.value)}
                            disabled={isCompleted || !isUnlocked}
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
          )}
        </div>

          {/* Bottom Action Bar */}
          <div className="flex justify-end pt-4 pb-8">
            <button
              onClick={handleSave}
              disabled={isLoading || (!isCompleted && !isUnlocked)}
              className={'w-full sm:w-auto font-black text-sm uppercase tracking-widest px-8 sm:px-10 py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ' + (
                isCompleted
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-2 border-slate-300'
                  : !isUnlocked
                  ? 'bg-slate-300 text-slate-500 border-2 border-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-brand-navy text-white hover:bg-slate-900 shadow-brand-navy/30 hover:shadow-2xl'
              )}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isCompleted ? 'CLOSE RECORD' : !isUnlocked ? 'UPLOAD DOCUMENTS TO UNLOCK' : 'SAVE RECORD'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheet;
