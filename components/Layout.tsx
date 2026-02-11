
import React from 'react';
import { LayoutDashboard, Calendar, History, User, LogOut, Layers } from 'lucide-react';
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
    <div className="flex flex-col md:flex-row min-h-screen bg-brand-gray">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white text-slate-900 p-6 flex-col sticky top-0 h-screen border-r border-slate-200">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-navy/10 overflow-hidden border border-slate-100">
            <img
              src="/assets/brand-logo.svg"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open text-brand-navy"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
              }}
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-brand-navy leading-none">{APP_CONFIG.PORTAL_INFO.NAME}</h1>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">{APP_CONFIG.PORTAL_INFO.TAGLINE}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === item.id
                ? 'bg-brand-navy text-white shadow-xl shadow-brand-navy/30'
                : 'text-slate-400 hover:text-brand-navy hover:bg-brand-gray/50'
                }`}
            >
              <div className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-brand-navy transition-colors'}>
                {item.icon}
              </div>
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="mt-auto flex items-center gap-3 px-4 py-4 text-slate-400 hover:text-red-500 transition-all font-bold group"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Sign Out</span>
        </button>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
            <img
              src="/assets/brand-logo.svg"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open text-brand-navy"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
              }}
            />
          </div>
          <h1 className="font-black text-brand-navy tracking-tight text-lg">{APP_CONFIG.PORTAL_INFO.NAME}</h1>
        </div>
        <button onClick={onLogout} className="text-slate-400 p-2 hover:bg-slate-50 rounded-full transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <main id="main-content-area" className="flex-1 pb-24 md:pb-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass px-2 py-3 safe-bottom z-40 flex justify-around items-center shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 min-w-[50px] transition-all duration-300 ${activeTab === item.id ? 'text-brand-navy scale-105' : 'text-slate-400'
              }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-brand-navy/5' : ''}`}>
              {item.icon}
            </div>
            <span className={`text-[8px] font-extrabold tracking-tight ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
