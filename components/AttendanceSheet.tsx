
// Fixed missing History icon import to resolve JSX element type error.
import React, { useState, useEffect, useRef } from 'react';
import { Session, Student, SessionStatus } from '../types';
import { Star, CheckCircle, XCircle, ChevronLeft, RefreshCcw, UserCheck, MessageSquarePlus, Users, History, Loader2, BookOpen, Clock, FileUp, StickyNote, FileText, Download, ChevronDown, Key, Check } from 'lucide-react';
import { studentLogService } from '../services/studentLogService';
import { sessionService } from '../services/sessionService';
import { GOOGLE_FORMS } from '../constants';

interface AttendanceSheetProps {
  session: Session;
  onUpdate: (updatedSession: Session) => void;
  onBack: () => void;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ session, onUpdate, onBack }) => {
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
      // Fetch fresh session data to get updated files
      const sessions = await sessionService.fetchByTeacherId(session.id.split('_')[0]); // Extract teacher ID
      const updatedSession = sessions.find(s => s.sessionId === session.sessionId);
      if (updatedSession) {
        onUpdate({ ...session, files: updatedSession.files });
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

    // Check for Session Proof
    const hasSessionProof = session.files.some(f => f.type === 'Session Proof');
    if (!hasSessionProof) {
      alert('Please upload a Session Proof before saving the record.');
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

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 md:relative bg-brand-gray md:bg-transparent z-[60] overflow-y-auto custom-scrollbar animate-in slide-in-from-right-full md:slide-in-from-bottom-4 duration-500"
    >
      <div className="min-h-full flex flex-col md:bg-white md:rounded-3xl md:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] md:border md:border-slate-100">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-brand-navy hover:text-white transition-all">
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-black text-brand-navy leading-none">
                  {isCompleted ? 'Historical Report' : 'Session Dashboard'}
                </h2>
                {/* Session ID Chip - Matching SessionCard Design */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session.sessionId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-slate-50 text-green-600 rounded-lg transition-all active:scale-95 hover:bg-green-50 group/copy ${!isCompleted ? 'animate-pulse' : ''}`}
                  title="Click to copy Session ID"
                >
                  {copiedId ? <Check size={11} /> : <Key size={11} className="text-green-600/40" />}
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest min-w-[60px] text-center">
                    {copiedId ? 'COPIED!' : session.sessionId}
                  </span>
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{session.className} • {session.subject}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`font-black text-[9px] md:text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 ${isCompleted ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'bg-brand-navy text-white hover:bg-slate-900 shadow-brand-navy/10'}`}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            {isCompleted ? 'CLOSE' : 'SAVE RECORD'}
          </button>
        </header>


        <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-full overflow-x-hidden relative">
          {isLoading && !isCompleted && (
            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-3xl">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="text-brand-navy animate-spin" />
                <p className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Processing records...</p>
              </div>
            </div>
          )}


          {/* Session Timing Section */}
          <section className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-brand-navy/40" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">SESSION TIMING</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Started At <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={startedTime}
                    onChange={(e) => setStartedTime(e.target.value)}
                    disabled={isCompleted}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold placeholder:text-slate-300 outline-none focus:border-brand-navy/20 transition-all disabled:opacity-60"
                  />
                  <button
                    onClick={() => {
                      const now = new Date();
                      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                      setStartedTime(time);
                    }}
                    disabled={isCompleted}
                    className="h-full aspect-square bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-brand-navy hover:text-white hover:border-brand-navy transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                    title="Set to Current Time"
                  >
                    <Clock size={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Ended At <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={endedTime}
                    onChange={(e) => setEndedTime(e.target.value)}
                    disabled={isCompleted}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold placeholder:text-slate-300 outline-none focus:border-brand-navy/20 transition-all disabled:opacity-60"
                  />
                  <button
                    onClick={() => {
                      const now = new Date();
                      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                      setEndedTime(time);
                    }}
                    disabled={isCompleted}
                    className="h-full aspect-square bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-brand-navy hover:text-white hover:border-brand-navy transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                    title="Set to Current Time"
                  >
                    <Clock size={18} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Session Topic Section */}
          <section className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-brand-navy/40" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">TOPIC COVERED <span className="text-red-500">*</span></h3>
            </div>
            <textarea
              value={topicCovered}
              onChange={(e) => setTopicCovered(e.target.value)}
              disabled={isCompleted}
              placeholder="What did you teach today? (e.g., Introduction to Photosynthesis, Quadratic Equations Part 2)"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold placeholder:text-slate-300 outline-none focus:border-brand-navy/20 transition-all min-h-[80px] resize-none disabled:opacity-60"
            />
          </section>

          {/* Learning Materials & Session Files - Combined Section */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

            {/* Upload Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 md:p-6 bg-slate-50/50">
              {/* Upload Session Proof */}
              {(() => {
                const sessionProofFile = session.files.find(f => f.type === 'Session Proof');
                const hasSessionProof = !!sessionProofFile;
                const proofUploadUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfuXQXs-skxQtBjNBgswKv3SmidM5D31u0mIEFpXbQzPFu6fA/viewform?usp=pp_url&entry.150359841=${encodeURIComponent(session.sessionId)}&entry.47705791=Session+Proof&entry.579457268=Screenshot`;

                return (
                  <a
                    href={hasSessionProof ? sessionProofFile.uploadFile : proofUploadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group border p-4 rounded-xl shadow-sm flex items-center gap-3 transition-all ${hasSessionProof
                      ? 'bg-green-50/50 border-green-200 cursor-pointer hover:bg-green-50 hover:border-green-300'
                      : 'bg-white border-slate-100 hover:border-orange-200 hover:shadow-md active:scale-[0.98] cursor-pointer'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${hasSessionProof
                      ? 'bg-green-100 border-green-200 text-green-600'
                      : 'bg-orange-50 border-orange-100 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'
                      }`}>
                      {hasSessionProof ? <CheckCircle size={18} /> : <FileUp size={18} />}
                    </div>
                    <div>
                      <h4 className={`text-xs font-black leading-tight transition-colors ${hasSessionProof ? 'text-green-700' : 'text-slate-700 group-hover:text-orange-600'
                        }`}>
                        {hasSessionProof ? 'Proof Uploaded' : 'Session Proof'}
                      </h4>
                      <p className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${hasSessionProof ? 'text-green-600/70' : 'text-slate-400'
                        }`}>
                        {hasSessionProof ? 'View File' : 'Limit 1 File'}
                      </p>
                    </div>
                  </a>
                );
              })()}

              {/* Upload Learning Materials */}
              <a
                href={`https://docs.google.com/forms/d/e/1FAIpQLSfuXQXs-skxQtBjNBgswKv3SmidM5D31u0mIEFpXbQzPFu6fA/viewform?usp=pp_url&entry.150359841=${encodeURIComponent(session.sessionId)}&entry.47705791=Learn+Docs&entry.579457268=`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-center gap-3 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <StickyNote size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-700 leading-tight group-hover:text-blue-600 transition-colors">Learning Material</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Helping Documents</p>
                </div>
              </a>
            </div>

            {/* Uploaded Files Display - Showing only Learn Docs */}
            {(() => {
              const learnDocs = session.files.filter(f => f.type === 'Learn Docs');
              return learnDocs.length > 0 ? (
                <>
                  <button
                    onClick={() => setShowFiles(!showFiles)}
                    className="w-full flex items-center justify-between px-5 md:px-6 py-4 bg-white hover:bg-slate-50 transition-all border-t border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-700">Uploaded Files</span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[9px] font-black">
                        {learnDocs.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefreshFiles();
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRefreshingFiles ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400 hover:bg-brand-navy hover:text-white'}`}
                        title="Refresh file list"
                      >
                        <RefreshCcw size={14} className={isRefreshingFiles ? 'animate-spin' : ''} />
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-slate-400 transition-transform duration-300 ${showFiles ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {showFiles && (
                    <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 bg-white">
                      {learnDocs.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.uploadFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 hover:border-blue-200 transition-all group"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                              <FileText size={18} className="text-white" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-black text-slate-800 truncate">
                                {file.fileName}
                              </span>
                              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                                Learn Document
                              </span>
                            </div>
                          </div>
                          <Download size={16} className="text-blue-600 group-hover:translate-y-0.5 transition-transform flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="px-5 md:px-6 py-8 text-center border-t border-slate-200 relative">
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={handleRefreshFiles}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRefreshingFiles ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400 hover:bg-brand-navy hover:text-white'}`}
                      title="Refresh file list"
                    >
                      <RefreshCcw size={14} className={isRefreshingFiles ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <FileText size={32} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs font-bold text-slate-400">No learning materials yet</p>
                  <p className="text-[9px] text-slate-300 mt-1">Upload documents using the blue button above</p>
                </div>
              );
            })()}
          </section>

          {/* Bulk Action & Stats Container */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {!isCompleted ? (
              <div className="lg:col-span-9 bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-6 xl:gap-10">
                {/* Bulk Status */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-slate-400" />
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">BULK STATUS</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllAttendance(true)}
                      className="flex-1 h-10 px-4 rounded-xl bg-green-50 text-green-600 border border-green-100 text-[9px] font-black uppercase hover:bg-green-100 transition-colors"
                    >
                      PRESENT
                    </button>
                    <button
                      onClick={() => setAllAttendance(false)}
                      className="flex-1 h-10 px-4 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 text-[9px] font-black uppercase hover:bg-slate-100 transition-colors"
                    >
                      ABSENT
                    </button>
                  </div>
                </div>

                {/* Bulk Rating */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck size={12} className="text-slate-400" />
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">BULK RATING</h3>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setGlobalRate(star)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${globalRate >= star
                          ? 'bg-brand-navy border-brand-navy text-white shadow-lg shadow-brand-navy/10'
                          : 'bg-white border-slate-100 text-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <Star size={16} fill={globalRate >= star ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk Comment */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus size={12} className="text-slate-400" />
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">BULK COMMENT</h3>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={globalComment}
                      onChange={(e) => setGlobalComment(e.target.value)}
                      placeholder="Observation for all..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold placeholder:text-slate-300 outline-none focus:border-brand-navy/20 transition-all"
                    />
                    <button
                      onClick={applyGlobalSettings}
                      className="bg-brand-navy text-white h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-brand-navy/10 active:scale-95"
                    >
                      APPLY
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-9 bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                  <History size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Record Locked</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">HISTORICAL DATA • VIEW ONLY</p>
                </div>
              </div>
            )}

            {/* Presence Summary */}
            <div className="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:rotate-180 transition-transform duration-700">
                <RefreshCcw size={12} className="text-slate-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">ENROLLMENT</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-black text-slate-800 tracking-tighter leading-none">{students.filter(s => s.attended).length}</span>
                  <span className="text-lg font-bold text-slate-300">/ {students.length}</span>
                </div>
              </div>
              <div className="w-full bg-slate-50 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-brand-navy transition-all duration-1000 ease-out"
                  style={{ width: `${(students.filter(s => s.attended).length / students.length) * 100}%` }}
                />
              </div>
            </div>
          </section>

          {/* Student Roll Table */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">STUDENT</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">STATUS</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">RATING <span className="text-red-500">*</span></th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[35%]">OBSERVATIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className={`transition-all duration-300 group ${student.attended ? 'bg-white' : 'bg-slate-50/10'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all duration-500 ${student.attended ? (isCompleted ? 'bg-slate-300' : 'bg-brand-navy') + ' text-white shadow-md' : 'bg-slate-100 text-slate-300'}`}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-black tracking-tight text-base transition-colors ${student.attended ? 'text-slate-800' : 'text-slate-300'}`}>{student.name}</p>
                            <p className="text-[9px] font-bold text-slate-400/50 uppercase tracking-widest mt-0.5">REG: {student.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleAttendance(student.id)}
                          disabled={isCompleted}
                          className={`inline-flex h-9 px-4 rounded-xl items-center gap-1.5 text-[9px] font-black uppercase transition-all duration-300 border ${student.attended
                            ? 'bg-green-50 text-green-600 border-green-100 shadow-sm'
                            : 'bg-white text-slate-300 border-slate-100'
                            } ${!isCompleted ? 'hover:scale-105 active:scale-95' : ''}`}
                        >
                          {student.attended ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {student.attended ? 'PRESENT' : 'ABSENT'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex gap-1 transition-all duration-500 ${student.attended ? 'opacity-100' : 'opacity-10 grayscale pointer-events-none'}`}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => updateRate(student.id, star)}
                              disabled={isCompleted}
                              className={`p-0.5 transition-all duration-200 ${!isCompleted ? 'hover:scale-110' : ''} ${student.listeningRate >= star ? (isCompleted ? 'text-slate-300' : 'text-brand-navy') : 'text-slate-100'}`}
                            >
                              <Star size={20} fill={student.listeningRate >= star ? "currentColor" : "none"} strokeWidth={1.5} />
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`transition-all duration-500 ${student.attended ? 'opacity-100' : 'opacity-10 pointer-events-none'}`}>
                          <input
                            type="text"
                            value={student.review}
                            onChange={(e) => updateReview(student.id, e.target.value)}
                            disabled={isCompleted}
                            placeholder="Add note..."
                            className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-slate-300 focus:ring-4 focus:ring-brand-navy/5 placeholder:text-slate-300 transition-all disabled:opacity-70"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>



          {/* Reschedule Button - Inline Bottom Right Alignment */}
          {!isCompleted && (
            <div className="flex justify-end pt-4 pb-8">
              <a
                href={dynamicRescheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 px-5 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-brand-navy hover:border-brand-navy/10 hover:bg-slate-50 transition-all active:scale-95 group"
                title="Request session reschedule"
              >
                <RefreshCcw size={11} className="group-hover:rotate-180 transition-transform duration-700 font-bold" />
                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em]">Reschedule Session?</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheet;
