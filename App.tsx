
import React, { useState, useEffect } from 'react';
import { teacherService } from './services/teacherService';
import Layout from './components/Layout';
import SessionCard from './components/SessionCard';
import AttendanceSheet from './components/AttendanceSheet';
import AvailabilityManager from './components/AvailabilityManager';
import AllocationDashboard from './components/AllocationDashboard';
import SubjectSelectorModal from './components/SubjectSelectorModal';
import { sessionService } from './services/sessionService';
import { Session, SessionStatus, TeacherProfile, Allocation } from './types';
import { allocationService } from './services/allocationService';
import { LogIn, Sparkles, ChevronRight, Calendar, ArrowUpRight, GraduationCap, Clock, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from './config';
import LoadingPopup from './components/LoadingPopup';


const App: React.FC = () => {
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setManagingSession(null);
    setIsCatalogView(false);
  };
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  const [isCatalogView, setIsCatalogView] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [managingSession, setManagingSession] = useState<Session | null>(null);

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(() => {
    const saved = localStorage.getItem('teacherProfile');
    try {
      return saved ? JSON.parse(saved) : {
        id: '',
        name: '',
        email: '',
        mobile: '',
        subjects: [],
        availability: [],
        status: 'Active'
      };
    } catch (e) {
      console.error('Failed to parse saved teacher profile', e);
      return {
        id: '',
        name: '',
        email: '',
        mobile: '',
        subjects: [],
        availability: [],
        status: 'Active'
      };
    }
  });

  // Fetch real sessions and allocations when authenticated
  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated && teacherProfile.id) {
        setIsSessionsLoading(true);
        try {
          const [sessionData, allocationData] = await Promise.all([
            sessionService.fetchByTeacherId(teacherProfile.id),
            allocationService.fetchByTeacherId(teacherProfile.id)
          ]);

          const sortedSessions = sessionData.sort((a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
          setSessions(sortedSessions);
          setAllocations(allocationData);
        } catch (error) {
          console.error('Failed to fetch data:', error);
          setSessions([]);
        } finally {
          setIsSessionsLoading(false);
        }
      }
    };

    fetchData();
  }, [isAuthenticated, teacherProfile.id]);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated.toString());
    localStorage.setItem('teacherProfile', JSON.stringify(teacherProfile));
    localStorage.setItem('activeTab', activeTab);
  }, [isAuthenticated, teacherProfile, activeTab]);

  // Scroll to top on tab change or view change
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainArea = document.getElementById('main-content-area');
    if (mainArea) mainArea.scrollTo(0, 0);
  }, [activeTab, managingSession, isCatalogView]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('teacherProfile');
    localStorage.removeItem('activeTab');
    // Reset state to defaults
    setTeacherProfile({
      id: '',
      name: '',
      email: '',
      mobile: '',
      subjects: [],
      availability: [],
      status: 'Active'
    });
    setActiveTab('dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const contact = (formData.get('contact') as string || '').trim();
    const password = (formData.get('password') as string || '').trim();

    if (!contact || !password) {
      setLoginError('Please enter both contact number and password');
      setIsLoading(false);
      return;
    }

    try {
      const teacherData = await teacherService.getTeacherByContact(contact);

      if (!teacherData) {
        setLoginError('Teacher not found. Please check your contact number.');
        setIsLoading(false);
        return;
      }

      const apiPassword = teacherData['Password'];
      if (apiPassword !== undefined && apiPassword !== null && String(apiPassword) !== String(password)) {
        setLoginError('Invalid password');
        setIsLoading(false);
        return;
      }

      const subjects = teacherData['Subjects ID(s)'] ? teacherData['Subjects ID(s)'].split(',').map(s => s.trim()) : [];

      setTeacherProfile({
        id: teacherData['Teacher ID'],
        name: teacherData['Name'],
        email: teacherData['Mail'] || '',
        mobile: teacherData['Contact'],
        subjects: subjects,
        availability: [],
        status: (teacherData['Status'] as 'Active' | 'In-Active') || 'Active'
      });

      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError(
        err.message && err.message.includes('Network') || err.message.includes('Failed') 
          ? `Connection Error: ${err.message}` 
          : 'An error occurred. Please try again.'
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSessionFiles = (sessionId: string, newFiles: Session['files']) => {
    setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, files: newFiles } : s));
  };

  const handleSessionUpdate = async (updated: Session) => {
    // Update local state first for immediate UI feedback
    setSessions(prev => prev.map(s => s.id === updated.id ? { ...updated, status: SessionStatus.COMPLETED } : s));

    // Sync to API
    setIsSessionsLoading(true);
    try {
      await sessionService.updateSession(updated.id, {
        "Status": "Completed"
      });
    } catch (e) {
      console.error('Failed to sync session status update', e);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  const handleUpdateProfileSubjects = async (ids: string[]) => {
    setTeacherProfile(prev => ({ ...prev, subjects: ids }));
    setIsCatalogView(false);

    // Sync to API
    setIsSessionsLoading(true);
    try {
      // Use current profile but with new subjects
      await teacherService.updateTeacher(teacherProfile.mobile, {
        "Subjects ID(s)": ids.join(', ')
      });
    } catch (e) {
      console.error('Failed to sync catalog selection', e);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-navy/5 rounded-full blur-[140px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-navy/5 rounded-full blur-[140px] opacity-60" />

        <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in duration-700 bg-white p-8 rounded-3xl border-2 border-slate-300 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center shadow-md mx-auto mb-4 border-2 border-slate-300 overflow-hidden">
              <img
                src="/assets/brand-logo.png"
                alt="Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-brand-navy flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>';
                }}
              />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{APP_CONFIG.PORTAL_INFO.NAME}</h1>
            <p className="text-slate-500 font-extrabold uppercase text-[9px] tracking-[0.3em]">{APP_CONFIG.PORTAL_INFO.FULL_NAME}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest ml-1">CONTACT NUMBER</label>
              <input
                type="text"
                name="contact"
                inputMode="numeric"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="e.g. 9876543210"
                className="w-full h-12 bg-slate-50 border-2 border-slate-300 rounded-xl px-4 text-slate-900 font-extrabold outline-none focus:bg-white focus:border-brand-navy transition-all placeholder:text-slate-400 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest ml-1">PASSWORD</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="w-full h-12 bg-slate-50 border-2 border-slate-300 rounded-xl px-4 text-slate-900 font-extrabold outline-none focus:bg-white focus:border-brand-navy transition-all placeholder:text-slate-400 text-sm"
              />
            </div>
            {loginError && (
              <p className="text-red-600 text-xs font-black text-center animate-in fade-in bg-red-50 p-2.5 rounded-xl border border-red-200">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-brand-navy text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 hover:bg-slate-900 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Authenticating...' : 'Authenticate'} <LogIn size={18} strokeWidth={3} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Handle Catalog Takeover
  if (isCatalogView) {
    return (
      <SubjectSelectorModal
        teacherId={teacherProfile.id}
        selectedIds={teacherProfile.subjects}
        onClose={() => setIsCatalogView(false)}
        onSelect={handleUpdateProfileSubjects}
      />
    );
  }

  const handleProfileUpdate = async (updated: TeacherProfile) => {
    const subjectsChanged = JSON.stringify(updated.subjects) !== JSON.stringify(teacherProfile.subjects);

    setTeacherProfile(updated);

    if (subjectsChanged) {
      setIsSessionsLoading(true);
      try {
        // Sync subjects to API
        await teacherService.updateTeacher(updated.mobile, {
          "Subjects ID(s)": updated.subjects.join(', ')
        });
      } catch (e) {
        console.error('Failed to sync profile update', e);
      } finally {
        setIsSessionsLoading(false);
      }
    }

    if (updated.status !== teacherProfile.status) {
      setIsSessionsLoading(true);
      try {
        await teacherService.updateTeacher(updated.mobile, {
          "Status": updated.status
        });
      } catch (e) {
        console.error('Failed to sync status update', e);
      } finally {
        setIsSessionsLoading(false);
      }
    }
  };

  const renderContent = () => {
    if (managingSession) {
      return (
        <AttendanceSheet
          session={managingSession}
          teacherId={teacherProfile.id}
          onUpdate={handleSessionUpdate}
          onBack={() => setManagingSession(null)}
          isCompleted={managingSession.status === SessionStatus.COMPLETED}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const next7Days = new Date(tomorrow);
        next7Days.setDate(tomorrow.getDate() + 7);

        const todaySessions = sessions.filter(s => {
          const d = new Date(s.startTime);
          return d >= today && d < tomorrow;
        });

        // Pending count includes all sessions up to the end of today that are not completed
        const pendingUpToToday = sessions.filter(s => {
          const d = new Date(s.startTime);
          return d < tomorrow && s.status === SessionStatus.UPCOMING;
        }).length;

        const todayCompleted = todaySessions.filter(s => s.status === SessionStatus.COMPLETED).length;

        const nextWeekCount = sessions.filter(s => {
          const d = new Date(s.startTime);
          return d >= tomorrow && d <= next7Days && s.status === SessionStatus.UPCOMING;
        }).length;

        const activeAllocations = allocations.filter(a => (a.status || 'Active').toLowerCase() === 'active');
        const uniqueStudentIds = new Set<string>();
        activeAllocations.forEach(a => {
          a.studentIds.forEach(id => uniqueStudentIds.add(id));
        });
        const totalUniqueStudents = uniqueStudentIds.size;

        const stats = {
          pendingToday: pendingUpToToday,
          completedToday: todayCompleted,
          nextWeek: nextWeekCount,
          totalStudents: totalUniqueStudents
        };

        const next = sessions.find(s => s.status === SessionStatus.UPCOMING);

        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">Hi, {teacherProfile.name.split(' ')[0]}!</h2>
                  <Sparkles className="text-amber-500 animate-pulse" size={28} />
                </div>
                <p className="text-slate-600 font-extrabold text-lg">You have <span className="text-brand-navy font-black border-b-2 border-brand-navy">{stats.pendingToday} sessions</span> pending.</p>
              </div>
              <div
                onClick={() => handleTabChange('availability')}
                className="flex items-center gap-4 bg-white p-3 pr-6 rounded-2xl border-2 border-slate-300 shadow-md group cursor-pointer hover:border-brand-navy transition-all self-start lg:self-auto"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-navy flex items-center justify-center text-white font-black text-lg shadow-md transition-transform group-hover:scale-105">
                  {teacherProfile.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">ACADEMIC ID</p>
                  <p className="text-base font-black text-slate-900 tracking-tight">{teacherProfile.id}</p>
                </div>
                <ArrowUpRight size={18} className="text-slate-400 ml-3 group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all" />
              </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              <div className="bg-brand-navy p-5 md:p-6 rounded-2xl text-white border-2 border-slate-900 shadow-md transition-all hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:scale-110 transition-transform">
                  <Clock size={64} />
                </div>
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-2 relative z-10">PENDING</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <p className="text-4xl md:text-5xl font-black tracking-tight leading-none">{stats.pendingToday}</p>
                  <span className="text-xs font-black text-white/70">Sessions</span>
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-2xl border-2 border-slate-300 border-t-4 border-t-emerald-500 shadow-md transition-all hover:-translate-y-1 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={64} />
                </div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">COMPLETED TODAY</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none group-hover:text-emerald-700 transition-colors">{stats.completedToday}</p>
                  <span className="text-xs font-black text-slate-500">Done</span>
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-2xl border-2 border-slate-300 border-t-4 border-t-blue-500 shadow-md transition-all hover:-translate-y-1 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600 group-hover:scale-110 transition-transform">
                  <Calendar size={64} />
                </div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">NEXT 7 DAYS</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-700 transition-colors">{stats.nextWeek}</p>
                  <span className="text-xs font-black text-slate-500">Planned</span>
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-2xl border-2 border-slate-300 border-t-4 border-t-indigo-500 shadow-md transition-all hover:-translate-y-1 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-600 group-hover:scale-110 transition-transform">
                  <GraduationCap size={64} />
                </div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">STUDENTS</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-700 transition-colors">{stats.totalStudents}</p>
                  <span className="text-xs font-black text-slate-500">Active</span>
                </div>
              </div>
            </div>

            {next ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-7 bg-brand-navy rounded-full" />
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Active Queue</h3>
                  </div>
                  <button onClick={() => handleTabChange('upcoming')} className="text-brand-navy text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                    VIEW FULL SCHEDULE <ChevronRight size={16} strokeWidth={3} />
                  </button>
                </div>
                <SessionCard session={next} onManage={setManagingSession} />
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-16 border-2 border-dashed border-slate-300 flex flex-col items-center text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-100 border-2 border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                  <Calendar size={40} />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">That's all for today!</h4>
                <p className="text-slate-600 font-bold text-base max-w-sm">You have completed all your scheduled sessions. Enjoy your rest.</p>
                <button onClick={() => handleTabChange('history')} className="mt-8 text-brand-navy font-black text-xs uppercase tracking-widest underline underline-offset-4 decoration-2">Audit Completed Logs</button>
              </div>
            )}
          </div>
        );

      case 'upcoming':
        const upcomingList = sessions.filter(s => s.status === SessionStatus.UPCOMING);
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="px-1">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Academic Queue</h2>
              <p className="text-slate-600 font-extrabold text-base mt-1">Active session management and real-time attendance logs</p>
            </div>
            {upcomingList.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {upcomingList.map(s => (
                  <SessionCard key={s.id} session={s} onManage={setManagingSession} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl py-24 border-2 border-slate-300 flex flex-col items-center text-center shadow-sm">
                <p className="text-slate-600 font-black uppercase tracking-widest">No sessions in queue</p>
              </div>
            )}
          </div>
        );

      case 'history':
        const completedList = sessions
          .filter(s => s.status === SessionStatus.COMPLETED)
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="px-1">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Historical Records</h2>
              <p className="text-slate-600 font-extrabold text-base mt-1">Performance audit and synthesis reports for past sessions</p>
            </div>
            {completedList.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {completedList.map(s => (
                  <SessionCard key={s.id} session={s} onManage={setManagingSession} showDetails={true} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl py-24 border-2 border-slate-300 flex flex-col items-center text-center shadow-sm">
                <p className="text-slate-600 font-black uppercase tracking-widest">Historical vault empty</p>
              </div>
            )}
          </div>
        );

      case 'allocation':
        return <AllocationDashboard teacherId={teacherProfile.id} />;

      case 'availability':
        return (
          <AvailabilityManager
            profile={teacherProfile}
            onUpdate={handleProfileUpdate}

          />
        );



      default:
        return null;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onLogout={handleLogout}
    >
      <div className="pb-20">
        {renderContent()}
      </div>
      {isSessionsLoading && <LoadingPopup message="Retrieving Sessions..." />}
    </Layout>
  );
};

export default App;
