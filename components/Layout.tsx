
import React from 'react';
import { LayoutDashboard, Calendar, History, User, LogOut, Layers, MessageCircle } from 'lucide-react';
import { APP_CONFIG } from '../config';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
    { id: 'upcoming', label: 'Class', icon: <Calendar size={20} /> },
    { id: 'history', label: 'History', icon: <History size={20} /> },
    { id: 'allocation', label: 'Allocation', icon: <Layers size={20} /> },
    { id: 'availability', label: 'Profile', icon: <User size={20} /> },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white text-slate-900 p-6 flex-col sticky top-0 h-screen border-r-2 border-slate-300 shadow-sm z-30">
        <div className="mb-8 flex items-center gap-3 px-2 pb-6 border-b-2 border-slate-200">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden border-2 border-slate-300 shrink-0">
            <img
              src="/assets/brand-logo.png"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open text-brand-navy"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
              }}
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">{APP_CONFIG.PORTAL_INFO.NAME}</h1>
            <p className="text-slate-600 text-[9px] font-extrabold uppercase tracking-widest mt-0.5">{APP_CONFIG.PORTAL_INFO.TAGLINE}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group border-2 ${isActive
                  ? 'bg-brand-navy text-white border-brand-navy shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-slate-100 hover:text-brand-navy'
                  }`}
              >
                <div className={isActive ? 'text-white' : 'text-slate-700 group-hover:text-brand-navy transition-colors'}>
                  {item.icon}
                </div>
                <span className={`text-sm tracking-tight ${isActive ? 'font-black' : 'font-extrabold'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 space-y-1 border-t-2 border-slate-200 mt-auto">
          <a
            href={APP_CONFIG.GOOGLE_FORMS.SUPPORT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border-2 border-transparent hover:border-emerald-200 transition-all font-black group text-sm"
          >
            <MessageCircle size={18} className="text-slate-600 group-hover:text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Support</span>
          </a>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-800 hover:text-red-700 hover:bg-red-50 rounded-xl border-2 border-transparent hover:border-red-200 transition-all font-black group text-sm"
          >
            <LogOut size={18} className="text-slate-600 group-hover:text-red-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b-2 border-slate-300 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border-2 border-slate-300 overflow-hidden shrink-0">
            <img
              src="/assets/brand-logo.png"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open text-brand-navy"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
              }}
            />
          </div>
          <h1 className="font-black text-slate-900 tracking-tight text-lg">{APP_CONFIG.PORTAL_INFO.NAME}</h1>
        </div>
        <button onClick={onLogout} className="text-slate-700 p-2 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors" title="Sign Out">
          <LogOut size={18} />
        </button>
      </header>

      {/* Main Content Area */}
      <main id="main-content-area" className="flex-1 pb-24 md:pb-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-300 px-3 py-2.5 safe-bottom z-40 flex justify-around items-center shadow-lg">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 min-w-[54px] py-1 px-2 rounded-xl transition-all duration-200 ${isActive ? 'text-brand-navy font-black bg-slate-100 border border-slate-300' : 'text-slate-700 font-extrabold hover:text-slate-900'
                }`}
            >
              <div className="shrink-0">
                {item.icon}
              </div>
              <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'font-black text-brand-navy' : 'font-extrabold text-slate-700'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
