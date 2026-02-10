
import React, { useState, useEffect } from 'react';
import { SUBJECT_CATALOG } from '../data/subjects';
import { Search, ExternalLink, Calendar, Clock, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { Allocation } from '../types';
import { allocationService } from '../services/allocationService';

interface AllocationDashboardProps {
  teacherId: string;
}

const AllocationDashboard: React.FC<AllocationDashboardProps> = ({ teacherId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<{ names: string[], ids: string[] } | null>(null);

  useEffect(() => {
    const fetchAllocations = async () => {
      setIsLoading(true);
      try {
        const data = await allocationService.fetchByTeacherId(teacherId);
        setAllocations(data);
      } catch (error) {
        console.error('Failed to fetch allocations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (teacherId) {
      fetchAllocations();
    }
  }, [teacherId]);

  const filteredAllocations = allocations.filter(alloc =>
    alloc.classRoomId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alloc.assignId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alloc.subjectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alloc.teacherId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentNames = (ids: string[], names: string[]) => {
    if (names && names.length > 0) return names;
    // Fallback logic for mock data if needed
    return ids.map(id => `Student ${id}`);
  };

  const groupedAllocations = filteredAllocations.reduce((acc, alloc) => {
    const status = alloc.status || 'Active';
    if (!acc[status]) acc[status] = [];
    acc[status].push(alloc);
    return acc;
  }, {} as Record<string, Allocation[]>);

  // Dynamic status order: Prioritize known ones, then add any new ones from API
  const preferredOrder = ['Active', 'Hold', 'Closed'];
  const dataStatuses = Object.keys(groupedAllocations);
  const statusOrder = [
    ...preferredOrder.filter(s => dataStatuses.includes(s)),
    ...dataStatuses.filter(s => !preferredOrder.includes(s))
  ];

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand-navy/10 border-t-brand-navy rounded-full animate-spin" />
          <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-navy animate-pulse" size={24} />
        </div>
        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Retrieving Allocations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 overflow-x-hidden">
      {/* Student List Popup */}
      {selectedStudents && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedStudents(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Assigned Students</h4>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Class Roster</p>
                </div>
                <button
                  onClick={() => setSelectedStudents(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all group"
                >
                  <Filter size={18} className="rotate-45 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {selectedStudents.names.map((name, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-brand-navy/20 transition-all">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{name}</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">{selectedStudents.ids[idx]}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedStudents(null)}
                className="w-full py-4 bg-brand-navy text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-brand-navy/20 active:scale-[0.98] transition-all"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Allocations</h2>
          <p className="text-slate-500 font-bold mt-1">Institutional teacher-to-student mapping logs</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search allocations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all"
          />
        </div>
      </div>

      <div className="space-y-10">
        {statusOrder.map(status => {
          const allocations = groupedAllocations[status];
          if (!allocations || allocations.length === 0) return null;

          return (
            <div key={status} className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <div className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-green-500' :
                  status === 'Hold' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{status} Allocations</h3>
                <span className="ml-auto text-[10px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">{allocations.length}</span>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="w-full overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="w-[32%] px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / CLASS / STUDENT</th>
                        <th className="w-[28%] px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SUBJECT / LINK</th>
                        <th className="w-[28%] px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SCHEDULE / DAYS</th>
                        <th className="w-[12%] px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocations.map((alloc) => {
                        const subject = SUBJECT_CATALOG.find(s => s.id === alloc.subjectId);
                        const studentNames = getStudentNames(alloc.studentIds, alloc.studentNames);
                        return (
                          <tr key={alloc.assignId} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-col gap-1.5 overflow-hidden">
                                <span className="text-[10px] font-black text-brand-navy">{alloc.assignId}</span>

                                <span className="text-[10px] font-bold text-slate-500 leading-tight truncate w-full" title={alloc.classRoomId}>
                                  {alloc.classRoomId}
                                </span>

                                <div className="mt-1">
                                  {studentNames.length === 1 ? (
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg w-fit group-hover:bg-white group-hover:border-slate-200 transition-colors">
                                      <span className="text-[10px] text-slate-800 font-black uppercase tracking-tight truncate max-w-[150px]">
                                        {studentNames[0]}
                                      </span>
                                      <span className="text-[8px] font-black text-slate-300 px-1 bg-white rounded border border-slate-50">
                                        {alloc.studentIds[0]}
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setSelectedStudents({ names: studentNames, ids: alloc.studentIds })}
                                      className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                                    >
                                      <span className="text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap">
                                        {studentNames.length} Students
                                      </span>
                                      <ExternalLink size={10} strokeWidth={3} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-col gap-1 overflow-hidden">
                                <span className="text-[10px] font-black text-slate-700 leading-tight line-clamp-2">
                                  {alloc.subjectLabel || subject?.name || alloc.subjectId}
                                </span>
                                <a
                                  href={alloc.meetLink.startsWith('http') ? alloc.meetLink : `https://${alloc.meetLink}`}
                                  target="_blank"
                                  className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform w-fit"
                                >
                                  Meeting Room <ExternalLink size={10} />
                                </a>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-col gap-1 overflow-hidden">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1 text-slate-600">
                                    <Calendar size={10} className="text-slate-400" />
                                    <span className="text-[10px] font-bold whitespace-nowrap">
                                      <span className="text-slate-400 font-medium mr-1 uppercase text-[8px] tracking-wider">Started</span>
                                      {alloc.startDate}
                                    </span>
                                  </div>
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-brand-navy/5 text-brand-navy rounded text-[8px] font-black border border-brand-navy/10">
                                    <RefreshCw size={8} strokeWidth={3} /> {alloc.weekCycle}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400 flex-wrap">
                                  <Clock size={10} className="text-slate-400" />
                                  <span className="text-[10px] font-bold whitespace-nowrap">{alloc.startTime} - {alloc.endTime}</span>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 leading-tight italic truncate w-full" title={alloc.days}>
                                  {alloc.days === 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday' ? 'Daily Class' : alloc.days}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center align-middle">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' :
                                status === 'Hold' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                  status === 'Closed' ? 'bg-slate-100 text-slate-400 border-slate-200' :
                                    'bg-brand-navy/5 text-brand-navy border-brand-navy/10'
                                }`}>
                                {status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAllocations.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center text-slate-300 bg-white rounded-3xl border border-slate-200">
            <Filter size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">No allocations match your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllocationDashboard;
