
import React, { useState, useEffect } from 'react';
import { Session, SessionStatus } from '../types';
import { Clock, Users, Key, ChevronRight, FileUp, Tag, Video, Check, FileText } from 'lucide-react';
import { GOOGLE_FORMS, MOCK_ALLOCATIONS } from '../constants';

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
  const allocation = MOCK_ALLOCATIONS.find(a => a.assignId === session.allocationId);

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

      // Reveal ID if it's 15 minutes before start OR if it's already started/ended
      setIsIDVisible(diffMins <= 15);

      if (diffMins > 15) {
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
  const learnDocsCount = session.files.filter(f => f.type === 'Learn Docs').length;
  const sessionProofsCount = session.files.filter(f => f.type === 'Session Proof').length;

  return (
    <div className={`group relative bg-white rounded-3xl border border-slate-100 p-6 transition-all duration-500 shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_50px_-10px_rgba(0,17,113,0.08)] ${isCompleted ? 'grayscale-[0.4] opacity-95' : ''}`}>

      {/* Top Section: Date, Info, Time */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-5">
          {/* Smart Date Badge */}
          <div className={`${isCompleted ? 'h-20' : 'h-16'} w-14 rounded-xl flex flex-col items-center justify-center font-black transition-all duration-500 relative overflow-hidden flex-shrink-0 ${isCompleted
            ? 'bg-slate-100 text-slate-400'
            : 'bg-brand-navy text-white shadow-lg shadow-brand-navy/10'
            }`}>
            <span className="text-[8px] uppercase tracking-widest leading-none mb-1 opacity-60">
              {startTime.toLocaleString([], { month: 'short' })}
            </span>
            <span className="text-lg leading-none my-0.5">{startTime.getDate()}</span>
            <span className="text-[8px] uppercase tracking-widest leading-none opacity-60">
              {startTime.toLocaleString([], { weekday: 'short' })}
            </span>
            {isCompleted && (
              <span className="text-[8px] uppercase tracking-widest leading-none opacity-60 mt-1">
                {startTime.getFullYear()}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <p className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.2em] mb-0.5">{session.className}</p>
            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none group-hover:text-brand-navy transition-colors">
              {session.subject}
            </h3>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <p className="text-lg font-black text-slate-800 leading-none lowercase tracking-tight mb-1">{timeStr}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">
              {session.durationMinutes} MINS
            </span>
          </div>
        </div>
      </div>

      {/* Badges Row - Updated theme for Allocation ID to match Student Count chip */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {/* Student Count */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
          <Users size={11} className="text-slate-400" />
          <span className="text-[9px] font-extrabold text-slate-400 tracking-tight">{session.students.length} Students</span>
        </div>

        {/* Allocation ID Badge (Theme updated to match Student Count) */}
        {session.allocationId && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <Tag size={11} className="text-slate-400" />
            <span className="text-[9px] font-extrabold text-slate-400 tracking-tight uppercase tracking-widest">{session.allocationId}</span>
          </div>
        )}

        {/* Session ID / Countdown (Updated Theme) */}
        {isIDVisible ? (
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 border border-slate-100 bg-slate-50 text-green-600 rounded-lg transition-all active:scale-95 hover:bg-green-50 group/copy ${!isCompleted ? 'animate-pulse' : ''}`}
            title="Click to copy Session ID"
          >
            {copied ? <Check size={11} /> : <Key size={11} className="text-green-600/40" />}
            <span className="text-[9px] font-black font-mono uppercase tracking-widest w-[80px] text-center">
              {copied ? 'COPIED!' : session.sessionId}
            </span>
          </button>
        ) : !isCompleted && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-100 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={11} className="opacity-40" />
            <span className="text-[9px] font-black uppercase tracking-tight">{countdown}</span>
          </div>
        )}

        {/* Join Classroom Button (Remains Dark per Screenshot) */}
        {allocation && allocation.meetLink && !isCompleted && (
          <a
            href={allocation.meetLink.startsWith('http') ? allocation.meetLink : `https://${allocation.meetLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-black transition-all shadow-sm active:scale-95"
          >
            <Video size={11} className="text-white/60" />
            <span className="text-[9px] font-black uppercase tracking-widest">Join Classroom</span>
          </a>
        )}
      </div>

      {/* Bottom Action Bar with File Counts */}
      <div className="flex items-center gap-3">
        {/* File Count Badges - Left Side */}
        <div className="flex flex-wrap items-center gap-2">
          {learnDocsCount > 0 && (
            <div className="w-11 h-11 rounded-xl bg-white border border-blue-200 flex flex-col items-center justify-center leading-none">
              <span className="text-sm font-black text-blue-600">{learnDocsCount}</span>
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-tight">Docs</span>
            </div>
          )}

          {sessionProofsCount > 0 && (
            <div className="w-11 h-11 rounded-xl bg-white border border-green-200 flex flex-col items-center justify-center leading-none">
              <Check size={16} className="text-green-500 mb-0.5" strokeWidth={3} />
              <span className="text-[7px] font-black text-green-500 uppercase tracking-tight">Proof</span>
            </div>
          )}
        </div>

        {/* Manage Session Button - Right Side */}
        <button
          onClick={() => onManage(session)}
          className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-3 font-black text-[9px] tracking-[0.2em] uppercase transition-all shadow-md active:scale-[0.98] ${isCompleted
            ? 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100 shadow-none'
            : 'bg-brand-navy text-white shadow-brand-navy/10 hover:bg-slate-900'
            }`}
        >
          {isCompleted ? 'REVIEW LOGS' : 'MANAGE SESSION'}
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default SessionCard;
