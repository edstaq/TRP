
import React, { useState, useEffect } from 'react';
import { Session, SessionStatus } from '../types';
import { Clock, Users, Key, ChevronRight, FileUp, Tag, Video, Check, FileText } from 'lucide-react';
import { GOOGLE_FORMS } from '../constants';

interface SessionCardProps {
  session: Session;
  onManage: (session: Session) => void;
  onEdit?: (session: Session) => void;
  showDetails?: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onManage, showDetails = false }) => {
  const [isIDVisible, setIsIDVisible] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(session.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCompleted = session.status === SessionStatus.COMPLETED;

  useEffect(() => {
    if (isCompleted) {
      setIsIDVisible(true);
      return;
    }

    const checkVisibility = () => {
      const now = new Date();
      const sessionTime = new Date(session.startTime);
      const diffMs = sessionTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      // Reveal ID if it's 30 minutes before start OR if it's already started/ended
      setIsIDVisible(diffMins <= 30);

      if (diffMins > 30) {
        setCountdown(`${diffMins}M UNTIL ID REVEAL`);
      } else if (diffMins <= 0 && diffMins > -session.durationMinutes) {
        setCountdown('ACTIVE NOW');
      } else {
        setCountdown('');
      }
    };

    checkVisibility();
    const timer = setInterval(checkVisibility, 30000);
    return () => clearInterval(timer);
  }, [session, isCompleted]);

  const startTime = new Date(session.startTime);
  const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  // Count files by type
  const files = session.files || [];
  const isVoiceSummary = (f: any) => {
    const fileName = (f.fileName || f.name || '').toLowerCase();
    return fileName.includes('voice summary') || fileName.includes('voicesummary') || fileName.includes('voice') || fileName.includes('audio');
  };
  const voiceSummaryCount = files.filter(isVoiceSummary).length;
  const learnDocsCount = files.filter(f => !isVoiceSummary(f) && (f.type === 'Learn Docs' || ((f.fileName || f.name) && ((f.fileName || f.name).toLowerCase().includes('material') || (f.fileName || f.name).toLowerCase().includes('doc'))))).length;
  const sessionProofsCount = files.filter(f => !isVoiceSummary(f) && (f.type === 'Session Proof' || ((f.fileName || f.name) && ((f.fileName || f.name).toLowerCase().includes('proof') || (f.fileName || f.name).toLowerCase().includes('screenshot'))))).length;

  return (
    <div className={`group relative bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 transition-all duration-500 shadow-sm hover:shadow-xl ${isCompleted ? 'grayscale-[0.4] opacity-95' : ''}`}>

      {/* Top Section: Date, Info, Time */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Smart Date Badge */}
          <div className={`${isCompleted ? 'h-16 sm:h-20' : 'h-14 sm:h-16'} w-12 sm:w-14 rounded-xl flex flex-col items-center justify-center font-black transition-all duration-500 relative overflow-hidden flex-shrink-0 ${isCompleted
            ? 'bg-slate-100 text-slate-400'
            : 'bg-brand-navy text-white shadow-lg shadow-brand-navy/10'
            }`}>
            <span className="text-[8px] uppercase tracking-widest leading-none mb-1 opacity-60">
              {startTime.toLocaleString([], { month: 'short' })}
            </span>
            <span className="text-base sm:text-lg leading-none my-0.5">{startTime.getDate()}</span>
            <span className="text-[8px] uppercase tracking-widest leading-none opacity-60">
              {startTime.toLocaleString([], { weekday: 'short' })}
            </span>
            {isCompleted && (
              <span className="text-[8px] uppercase tracking-widest leading-none opacity-60 mt-1">
                {startTime.getFullYear()}
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <p className="text-[9px] font-black text-brand-navy/60 uppercase tracking-[0.2em] mb-0.5 truncate">{session.className}</p>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug group-hover:text-brand-navy transition-colors line-clamp-2 break-words" title={session.subject}>
              {session.subject}
            </h3>
          </div>
        </div>

        <div className="flex-shrink-0 text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <p className="text-base sm:text-lg font-black text-slate-900 leading-none lowercase tracking-tight whitespace-nowrap">{timeStr}</p>
          <div className="flex items-center gap-1.5 sm:mt-1 whitespace-nowrap">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {session.durationMinutes} MINS
            </span>
          </div>
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8">
        {/* Student Count */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
          <Users size={11} className="text-slate-500" />
          <span className="text-[9px] font-black text-slate-600 tracking-tight">{session.students.length} Students</span>
        </div>

        {/* Allocation ID Badge */}
        {session.allocationId && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Tag size={11} className="text-slate-500" />
            <span className="text-[9px] font-black text-slate-600 tracking-tight uppercase tracking-widest">{session.allocationId}</span>
          </div>
        )}

        {/* Session ID / Countdown */}
        {isIDVisible ? (
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 bg-emerald-50/60 text-emerald-700 rounded-lg transition-all active:scale-95 hover:bg-emerald-100 group/copy ${!isCompleted ? 'animate-pulse' : ''}`}
            title="Click to copy Session ID"
          >
            {copied ? <Check size={11} /> : <Key size={11} className="text-emerald-600/70" />}
            <span className="text-[9px] font-black font-mono uppercase tracking-widest min-w-[70px] text-center">
              {copied ? 'COPIED!' : session.sessionId}
            </span>
          </button>
        ) : !isCompleted && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg">
            <Clock size={11} className="opacity-60" />
            <span className="text-[9px] font-black uppercase tracking-tight">{countdown}</span>
          </div>
        )}

        {/* Join Classroom Button */}
        {session.meetLink && !isCompleted && isIDVisible && (
          <a
            href={session.meetLink.startsWith('http') ? session.meetLink : `https://${session.meetLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-black transition-all shadow-sm active:scale-95"
          >
            <Video size={11} className="text-white/80" />
            <span className="text-[9px] font-black uppercase tracking-widest">Join Classroom</span>
          </a>
        )}
      </div>

      {/* Bottom Action Bar with File Counts */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* File Count Badges */}
        {(learnDocsCount > 0 || sessionProofsCount > 0 || voiceSummaryCount > 0) && (
          <div className="flex items-center gap-2">
            {learnDocsCount > 0 && (
              <div className="h-10 px-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-1.5">
                <span className="text-xs font-black text-blue-700">{learnDocsCount}</span>
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-tight">Docs</span>
              </div>
            )}

            {sessionProofsCount > 0 && (
              <div className="h-10 px-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Proof</span>
              </div>
            )}

            {voiceSummaryCount > 0 && (
              <div className="h-10 px-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                <span className="text-[9px] font-black text-purple-700 uppercase tracking-wider">Voice</span>
              </div>
            )}
          </div>
        )}

        {/* Manage Session Button */}
        <button
          onClick={() => onManage(session)}
          className={`w-full sm:flex-1 h-11 rounded-xl flex items-center justify-center gap-3 font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-md active:scale-[0.98] ${isCompleted
            ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 shadow-none'
            : 'bg-brand-navy text-white shadow-brand-navy/20 hover:bg-slate-900'
            }`}
        >
          {isCompleted ? 'REVIEW YOUR SESSION' : 'MARK YOUR SESSION'}
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default SessionCard;
