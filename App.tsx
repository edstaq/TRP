
import React, { useState, useEffect } from 'react';
import { teacherService } from './services/teacherService';
import Layout from './components/Layout';
import SessionCard from './components/SessionCard';
import AttendanceSheet from './components/AttendanceSheet';
import AvailabilityManager from './components/AvailabilityManager';
import AllocationDashboard from './components/AllocationDashboard';
import SubjectSelectorModal from './components/SubjectSelectorModal';
import { sessionService } from './services/sessionService';
import { MOCK_SESSIONS } from './constants';
import { Session, SessionStatus, TeacherProfile, Allocation } from './types';
import { allocationService } from './services/allocationService';
import { LogIn, Sparkles, ChevronRight, Calendar, ArrowUpRight, GraduationCap, Clock, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from './config';
import LoadingPopup from './components/LoadingPopup';


const App: React.FC = () => {
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
        availability: []
      };
    } catch (e) {
      console.error('Failed to parse saved teacher profile', e);
      return {
        id: '',
        name: '',
        email: '',
        mobile: '',
        subjects: [],
        availability: []
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

          const sortedSessions = (sessionData.length > 0 ? sessionData : MOCK_SESSIONS).sort((a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
          setSessions(sortedSessions);
          setAllocations(allocationData);
        } catch (error) {
          console.error('Failed to fetch data:', error);
          setSessions(MOCK_SESSIONS);
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
      availability: []
    });
    setActiveTab('dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const contact = formData.get('contact') as string;
    const password = formData.get('password') as string;

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
        availability: []
      });

      setIsAuthenticated(true);
    } catch (err) {
      setLoginError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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
      <div className="min-h-screen bg-brand-gray flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-navy/5 rounded-full blur-[140px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-navy/5 rounded-full blur-[140px] opacity-60" />

        <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in duration-700">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-navy/30 mx-auto mb-6 transform hover:rotate-6 transition-transform border border-slate-100 overflow-hidden">
              <img
                src="/assets/brand-logo.png"
                alt="Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-brand-navy flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>';
                }}
              />
            </div>
            <h1 className="text-3xl font-black text-brand-navy tracking-tight mb-1">{APP_CONFIG.PORTAL_INFO.NAME}</h1>
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.4em]">{APP_CONFIG.PORTAL_INFO.FULL_NAME}</p>
          </div>


          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CONTACT NUMBER</label>
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
                className="w-full h-14 bg-white border border-slate-100 rounded-2xl px-5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all placeholder:text-slate-300 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PASSWORD</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="w-full h-14 bg-white border border-slate-100 rounded-2xl px-5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all placeholder:text-slate-300 shadow-sm"
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-xs font-bold text-center animate-in fade-in">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-brand-navy text-white rounded-2xl font-black text-sm shadow-2xl shadow-brand-navy/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 hover:bg-slate-900 disabled:opacity-70 disabled:cursor-not-allowed"
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
  };



  const renderContent = () => {
    if (managingSession) {
      return (
        <AttendanceSheet
          session={managingSession}
          onUpdate={handleSessionUpdate}
          onBack={() => setManagingSession(null)}
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
          return d < tomorrow && s.status !== SessionStatus.COMPLETED;
        }).length;

        const todayCompleted = todaySessions.filter(s => s.status === SessionStatus.COMPLETED).length;

        const nextWeekCount = sessions.filter(s => {
          const d = new Date(s.startTime);
          return d >= tomorrow && d <= next7Days;
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

        const next = sessions.find(s => s.status !== SessionStatus.COMPLETED);

        return (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter">Hi, {teacherProfile.name.split(' ')[0]}!</h2>
                  <Sparkles className="text-amber-400 animate-pulse" size={32} />
                </div>
                <p className="text-slate-400 font-bold text-xl">You have <span className="text-brand-navy font-black border-b-4 border-brand-navy/10">{stats.pendingToday} sessions</span> pending.</p>
              </div>
              <div
                onClick={() => setActiveTab('availability')}
                className="flex items-center gap-5 bg-white p-3 pr-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group cursor-pointer hover:border-brand-navy/20 transition-all hover:shadow-2xl hover:shadow-brand-navy/5"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-navy flex items-center justify-center text-white font-black text-xl shadow-xl shadow-brand-navy/10 transition-transform group-hover:scale-105">
                  {teacherProfile.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-0.5">ACADEMIC ID</p>
                  <p className="text-lg font-black text-brand-navy tracking-tight">{teacherProfile.id}</p>
                </div>
                <ArrowUpRight size={16} className="text-slate-200 ml-4 group-hover:text-brand-navy group-hover:translate-x-1 transition-all" />
              </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-brand-navy p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl shadow-brand-navy/20 transition-all hover:-translate-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-5 md:p-8 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000">
                  <Clock size={60} className="md:w-20 md:h-20" />
                </div>
                <p className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 md:mb-4 relative z-10">PENDING</p>
                <div className="flex items-baseline gap-1 md:gap-2 relative z-10">
                  <p className="text-4xl md:text-6xl font-black tracking-tighter leading-none">{stats.pendingToday}</p>
                  <span className="text-[10px] md:text-sm font-bold text-white/40">Sessions</span>
                </div>
              </div>

              <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-2 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 md:p-8 opacity-5 group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-1000 text-brand-navy">
                  <CheckCircle2 size={60} className="md:w-20 md:h-20" />
                </div>
                <p className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 md:mb-4">COMPLETED TODAY</p>
                <div className="flex items-baseline gap-1 md:gap-2">
                  <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-brand-navy transition-colors">{stats.completedToday}</p>
                  <span className="text-[10px] md:text-sm font-bold text-slate-300 group-hover:text-slate-400">Done</span>
                </div>
              </div>

              <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-2 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 md:p-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000 text-brand-navy">
                  <Calendar size={60} className="md:w-20 md:h-20" />
                </div>
                <p className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 md:mb-4">NEXT 7 DAYS</p>
                <div className="flex items-baseline gap-1 md:gap-2">
                  <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-brand-navy transition-colors">{stats.nextWeek}</p>
                  <span className="text-[10px] md:text-sm font-bold text-slate-300 group-hover:text-slate-400">Planned</span>
                </div>
              </div>

              <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-2 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 md:p-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000 text-brand-navy">
                  <GraduationCap size={60} className="md:w-20 md:h-20" />
                </div>
                <p className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 md:mb-4">STUDENTS</p>
                <div className="flex items-baseline gap-1 md:gap-2">
                  <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-brand-navy transition-colors">{stats.totalStudents}</p>
                  <span className="text-[10px] md:text-sm font-bold text-slate-300 group-hover:text-slate-400">Active</span>
                </div>
              </div>
            </div>

            {next ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-brand-navy rounded-full" />
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Active Queue</h3>
                  </div>
                  <button onClick={() => setActiveTab('upcoming')} className="text-brand-navy text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-4 transition-all">
                    VIEW FULL SCHEDULE <ChevronRight size={16} strokeWidth={3} />
                  </button>
                </div>
                <SessionCard session={next} onManage={setManagingSession} />
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-24 border-2 border-dashed border-slate-100 flex flex-col items-center text-center shadow-inner">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-8 animate-bounce duration-[3000ms]">
                  <Calendar size={48} />
                </div>
                <h4 className="text-2xl font-black text-slate-800 tracking-tight mb-2">That's all for today!</h4>
                <p className="text-slate-400 font-bold text-lg max-w-sm">You have completed all your scheduled sessions. Enjoy your rest.</p>
                <button onClick={() => setActiveTab('history')} className="mt-10 text-brand-navy font-black text-xs uppercase tracking-[0.2em] underline underline-offset-[16px] decoration-4 decoration-brand-navy/10 hover:decoration-brand-navy transition-all">Audit Completed Logs</button>
              </div>
            )}
          </div>
        );

      case 'upcoming':
        const upcomingList = sessions.filter(s => s.status !== SessionStatus.COMPLETED);
        return (
          <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
            <div className="px-2">
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Academic Queue</h2>
              <p className="text-slate-400 font-bold text-lg mt-2">Active session management and real-time attendance logs</p>
            </div>
            {upcomingList.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {upcomingList.map(s => (
                  <SessionCard key={s.id} session={s} onManage={setManagingSession} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] py-32 border border-slate-100 flex flex-col items-center text-center shadow-sm">
                <p className="text-slate-300 font-black uppercase tracking-[0.4em]">No sessions in queue</p>
              </div>
            )}
          </div>
        );

      case 'history':
        const completedList = sessions
          .filter(s => s.status === SessionStatus.COMPLETED)
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        return (
          <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
            <div className="px-2">
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Historical Records</h2>
              <p className="text-slate-400 font-bold text-lg mt-2">Performance audit and synthesis reports for past sessions</p>
            </div>
            {completedList.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {completedList.map(s => (
                  <SessionCard key={s.id} session={s} onManage={setManagingSession} showDetails={true} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] py-32 border border-slate-100 flex flex-col items-center text-center shadow-sm">
                <p className="text-slate-300 font-black uppercase tracking-[0.4em]">Historical vault empty</p>
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
            onOpenCatalog={() => setIsCatalogView(true)}
          />
        );



      default:
        return null;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
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
