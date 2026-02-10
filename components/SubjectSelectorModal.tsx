import React, { useState, useMemo, useEffect, useRef } from 'react';
import { subjectService, SubjectAPIData } from '../services/subjectService';
import { SubjectCatalogItem } from '../types';
import {
  Search,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  CheckSquare,
  Square,
  Loader2,
  LayoutGrid,
  List
} from 'lucide-react';

interface SubjectSelectorModalProps {
  teacherId: string;
  selectedIds: string[];
  onClose: () => void;
  onSelect: (ids: string[]) => void;
}

const SubjectSelectorModal: React.FC<SubjectSelectorModalProps> = ({
  teacherId,
  selectedIds,
  onClose,
  onSelect
}) => {
  const [search, setSearch] = useState('');
  const [currentSelection, setCurrentSelection] = useState<string[]>(selectedIds);
  const [subjects, setSubjects] = useState<SubjectCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);

  // Filter States
  const [filters, setFilters] = useState({
    category: 'All',
    board: 'All',
    level: 'All',
    department: 'All',
    stage: 'All'
  });

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const data = await subjectService.getAllSubjects();

        const transformed: SubjectCatalogItem[] = data.map(s => ({
          id: String(s['Subject ID'] || ''),
          name: s['Label'] || s['Subject Name'] || 'Unnamed Subject',
          category: s['Category'] || '',
          board: s['Board'] || '',
          level: s['Level'] || '',
          department: s['Department'] || '',
          code: String(s['Subject Code'] || ''),
          tags: s['Tags'] && typeof s['Tags'] === 'string' ? s['Tags'].split(',').map(t => t.trim()) : [],
          status: s['Status'] || 'Active',
          description: s['Subject Description'] || s['Structure'] || '',
          teacherIds: [],
          price: 0,
          label: s['Label'] || s['Subject Name'] || '',
          stage: s['Stage'] || '',
        }));
        setSubjects(transformed);
      } catch (error) {
        console.error('Failed to load subject catalog:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const filterOptions = useMemo(() => {
    if (loading) return {};
    const filterKeys = ['category', 'board', 'level', 'department', 'stage'] as const;
    const options: Record<string, string[]> = {};

    filterKeys.forEach(key => {
      const rawValues = subjects.map(s => String(s[key] || ''));
      const unique = Array.from(new Set(rawValues)).filter(Boolean) as string[];
      options[key] = ['All', ...unique];
    });

    return options;
  }, [subjects, loading]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(sub => {
      const searchStr = search.toLowerCase();
      const matchesSearch =
        (sub.name || '').toLowerCase().includes(searchStr) ||
        (sub.code || '').toLowerCase().includes(searchStr) ||
        (sub.description || '').toLowerCase().includes(searchStr) ||
        (sub.id || '').toLowerCase().includes(searchStr) ||
        (sub.label && sub.label.toLowerCase().includes(searchStr));

      const matchesCategory = filters.category === 'All' || sub.category === filters.category;
      const matchesBoard = filters.board === 'All' || sub.board === filters.board;
      const matchesLevel = filters.level === 'All' || sub.level === filters.level;
      const matchesDept = filters.department === 'All' || sub.department === filters.department;
      const matchesStage = filters.stage === 'All' || sub.stage === filters.stage;

      return matchesSearch && matchesCategory && matchesBoard && matchesLevel && matchesDept && matchesStage;
    });
  }, [search, filters, subjects]);

  const toggleSubject = (id: string) => {
    setCurrentSelection(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allFilteredSelected = filteredSubjects.length > 0 &&
    filteredSubjects.every(s => currentSelection.includes(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setCurrentSelection(prev => prev.filter(id => !filteredSubjects.find(s => id === s.id)));
    } else {
      const filteredIds = filteredSubjects.map(s => s.id);
      setCurrentSelection(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const resetFilters = () => {
    setFilters({
      category: 'All',
      board: 'All',
      level: 'All',
      department: 'All',
      stage: 'All'
    });
    setSearch('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">

      {/* Header */}
      <header className="px-6 md:px-10 py-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-6 bg-white shrink-0">
        <div className="flex items-center gap-4 shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Catalog Management</h2>
          <div className="flex items-center bg-blue-50 px-3 py-1.5 rounded-lg border-blue-100 border">
            <CheckCircle2 size={14} className="text-brand-navy mr-2" />
            <span className="text-[10px] font-black text-brand-navy uppercase tracking-widest">
              {currentSelection.length} SELECTED
            </span>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex-1 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              placeholder="Search index by name, code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-brand-navy/20 transition-all placeholder:text-slate-300"
            />
          </div>

          <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={resetFilters}
            className="h-12 px-5 flex items-center gap-2 text-slate-400 hover:text-brand-navy transition-colors font-black text-[10px] uppercase tracking-widest"
          >
            <RotateCcw size={16} /> RESET
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={() => onSelect(currentSelection)}
            className="h-12 px-8 rounded-xl bg-brand-navy text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-navy/10 hover:bg-slate-900 active:scale-95 transition-all"
          >
            APPLY SELECTION
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/30">
        <div className="max-w-7xl mx-auto space-y-10">

          {/* Quick Filters Row */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(filterOptions).map(([key, options]: [string, string[]]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">{key}</span>
                <select
                  value={filters[key as keyof typeof filters]}
                  onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                  className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 outline-none focus:border-brand-navy/30 transition-all cursor-pointer"
                >
                  {options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}

            <div className="flex flex-col gap-1.5 ml-auto self-end">
              <button
                onClick={toggleSelectAll}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white flex items-center gap-2 hover:bg-slate-50 transition-all"
              >
                {allFilteredSelected ? <CheckSquare size={16} className="text-brand-navy" /> : <Square size={16} className="text-slate-300" />}
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Select All Filtered</span>
              </button>
            </div>
          </div>

          {/* Catalog View */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={40} className="animate-spin mb-4 text-brand-navy" />
              <p className="text-xs font-black uppercase tracking-widest">Loading Catalog Index...</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredSubjects.map(sub => {
                const isSelected = currentSelection.includes(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => toggleSubject(sub.id)}
                    className={`group relative border p-5 rounded-2xl cursor-pointer transition-all duration-300 flex items-start gap-4 h-auto shadow-sm ${isSelected
                      ? 'bg-white border-brand-navy shadow-lg shadow-brand-navy/5'
                      : 'bg-[#F8FAFC] border-slate-100 hover:bg-white hover:border-brand-navy/20 hover:shadow-xl hover:shadow-brand-navy/5'
                      }`}
                  >
                    {/* LEADING (Leading Icon) */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${isSelected
                      ? 'bg-brand-navy text-white'
                      : 'bg-white text-brand-navy border border-slate-100 shadow-sm group-hover:bg-brand-navy group-hover:text-white'
                      }`}>
                      <BookOpen size={24} />
                    </div>

                    {/* CENTER (Title, Subtitle, Chips) */}
                    <div className="flex-1 min-w-0 pr-10">
                      <div className="flex flex-col gap-1 mb-3">
                        <h4 className={`font-black text-base leading-none transition-colors truncate ${isSelected ? 'text-brand-navy' : 'text-slate-800 group-hover:text-brand-navy'
                          }`}>
                          {sub.name}
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 leading-relaxed line-clamp-2">
                          {sub.description}
                        </p>
                      </div>

                      {/* CHIPS AREA */}
                      <div className="flex flex-wrap gap-1.5">
                        {sub.stage && (
                          <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.stage}</span>
                        )}
                        {sub.department && sub.department !== 'General' && (
                          <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.department}</span>
                        )}
                        {sub.board && (
                          <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.board}</span>
                        )}
                        {sub.level && (
                          <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.level}</span>
                        )}
                        {sub.category && (
                          <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.category}</span>
                        )}
                        {sub.code && (
                          <span className="text-[8px] font-black px-2 py-0.5 bg-brand-navy/5 text-brand-navy rounded-md uppercase tracking-widest">{sub.code}</span>
                        )}
                        {sub.tags && sub.tags.map((tag, i) => (
                          <span key={i} className="text-[8px] font-black px-2 py-0.5 bg-blue-50 text-brand-navy rounded-md uppercase tracking-widest">{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* TRAILING (Selection Indicator) */}
                    <div className="absolute top-5 right-5">
                      {isSelected ? (
                        <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center shadow-lg shadow-brand-navy/20 animate-in zoom-in duration-300">
                          <CheckCircle2 size={18} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-slate-100 text-slate-100 flex items-center justify-center group-hover:border-slate-200 transition-colors">
                          <Square size={18} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredSubjects.map(sub => {
                const isSelected = currentSelection.includes(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => toggleSubject(sub.id)}
                    className={`group relative border px-6 py-4 rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-6 shadow-sm ${isSelected
                      ? 'bg-white border-brand-navy shadow-lg shadow-brand-navy/5'
                      : 'bg-[#F8FAFC] border-slate-100 hover:bg-white hover:border-brand-navy/20 hover:shadow-md'
                      }`}
                  >
                    {/* LEADING (Leading Icon) */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shrink-0 ${isSelected
                      ? 'bg-brand-navy text-white'
                      : 'bg-white text-brand-navy border border-slate-100 group-hover:bg-brand-navy group-hover:text-white'
                      }`}>
                      <BookOpen size={18} />
                    </div>

                    {/* CENTER (Title, Code, Metadata) */}
                    <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-black text-sm leading-none transition-colors truncate ${isSelected ? 'text-brand-navy' : 'text-slate-800'
                          }`}>
                          {sub.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-slate-400">{sub.code}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{sub.description}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        {sub.stage && (
                          <span className="text-[7px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-sm uppercase tracking-widest shrink-0">{sub.stage}</span>
                        )}
                        {sub.board && (
                          <span className="text-[7px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-sm uppercase tracking-widest shrink-0">{sub.board}</span>
                        )}
                        {sub.level && (
                          <span className="text-[7px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-sm uppercase tracking-widest shrink-0">{sub.level}</span>
                        )}
                      </div>
                    </div>

                    {/* TRAILING (Selection Indicator) */}
                    <div className="shrink-0 flex items-center gap-4">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-brand-navy text-white flex items-center justify-center shadow-lg shadow-brand-navy/20 animate-in zoom-in duration-300">
                          <CheckCircle2 size={14} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-100 text-slate-100 flex items-center justify-center group-hover:border-slate-200 transition-colors">
                          <Square size={14} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredSubjects.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">No Results Found</h3>
              <p className="text-slate-400 font-bold text-sm mt-1 max-w-xs">Adjust your search or filters to find the academic module you are looking for.</p>
              <button
                onClick={resetFilters}
                className="mt-8 text-brand-navy font-black text-[10px] uppercase tracking-widest underline underline-offset-8 decoration-2 decoration-brand-navy/10 hover:decoration-brand-navy transition-all"
              >
                Clear All Search Parameters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectSelectorModal;
