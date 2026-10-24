import React, { useState, useMemo, useEffect } from 'react';
import { SubjectCatalogItem, TeacherProfile } from '../types';
import { subjectService, SubjectAPIData } from '../services/subjectService';
import {
  GraduationCap,
  Layers,
  Building2,
  BookOpen,
  Sparkles,
  Tag,
  Check,
  RotateCcw,
  Save,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Undo2
} from 'lucide-react';

interface DynamicSubjectSelectorProps {
  profile: TeacherProfile;
  currentSubjectIds: string[];
  onSubjectsChange: (newSubjectIds: string[]) => void;
  onSaveProfile: (newSubjectIds: string[]) => Promise<void>;
}

interface FacetSelections {
  category: string[];
  board: string[];
  department: string[];
  level: string[];
  stage: string[];
  subjectName: string[];
}

const INITIAL_SELECTIONS: FacetSelections = {
  category: [],
  board: [],
  department: [],
  level: [],
  stage: [],
  subjectName: []
};

// Natural sort helper (e.g., Class 1, Class 2, ... Class 10, Plus 1, Plus 2)
const naturalSort = (a: string, b: string): number => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

export const DynamicSubjectSelector: React.FC<DynamicSubjectSelectorProps> = ({
  profile,
  currentSubjectIds,
  onSubjectsChange,
  onSaveProfile
}) => {
  const [catalog, setCatalog] = useState<SubjectCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [selections, setSelections] = useState<FacetSelections>(INITIAL_SELECTIONS);
  const [hasInitializedFromProfile, setHasInitializedFromProfile] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [showPreviewList, setShowPreviewList] = useState<boolean>(false);

  // Fetch full master catalog once on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        setLoadError('');
        const rawData: SubjectAPIData[] = await subjectService.getAllSubjects();

        if (!isMounted) return;

        const transformed: SubjectCatalogItem[] = rawData.map(s => {
          let boardVal = String(s['Board'] || '').trim();
          if (boardVal.toUpperCase() === 'KERALA') {
            boardVal = 'Kerala';
          }

          let deptVal = String(s['Department'] || '').trim();
          if (!deptVal) deptVal = 'General';

          return {
            id: String(s['Subject ID'] || ''),
            name: String(s['Subject Name'] || '').trim(),
            label: String(s['Label'] || s['Subject Name'] || '').trim(),
            board: boardVal,
            stage: String(s['Stage'] || '').trim(),
            level: String(s['Level'] || '').trim(),
            department: deptVal,
            category: String(s['Category'] || 'School').trim(),
            code: String(s['Subject Code'] || '').trim(),
            tags: s['Tags'] && typeof s['Tags'] === 'string' ? s['Tags'].split(',').map(t => t.trim()) : [],
            status: String(s['Status'] || 'Active'),
            description: String(s['Subject Description'] || s['Structure'] || ''),
            teacherIds: [],
            price: 0
          };
        }).filter(item => item.id);

        setCatalog(transformed);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load subject catalog:', err);
        setLoadError('Failed to load master subject catalog. Please reload.');
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to compute initial selections from teacher's existing profile subjects
  const getSelectionsFromProfile = (subjectIds: string[], cat: SubjectCatalogItem[]): FacetSelections => {
    if (!subjectIds || subjectIds.length === 0 || cat.length === 0) {
      return INITIAL_SELECTIONS;
    }
    const teacherSubjects = cat.filter(item => subjectIds.includes(item.id));
    if (teacherSubjects.length === 0) {
      return INITIAL_SELECTIONS;
    }

    return {
      category: Array.from(new Set(teacherSubjects.map(s => s.category).filter(Boolean))),
      board: Array.from(new Set(teacherSubjects.map(s => s.board).filter(Boolean))),
      department: Array.from(new Set(teacherSubjects.map(s => s.department).filter(Boolean))),
      level: Array.from(new Set(teacherSubjects.map(s => s.level).filter(Boolean))),
      stage: Array.from(new Set(teacherSubjects.map(s => s.stage).filter(Boolean))),
      subjectName: Array.from(new Set(teacherSubjects.map(s => s.name).filter(Boolean)))
    };
  };

  // Pre-populate selections by analyzing the teacher's current assigned subjects in database
  useEffect(() => {
    if (!hasInitializedFromProfile && catalog.length > 0) {
      const initial = getSelectionsFromProfile(currentSubjectIds, catalog);
      setSelections(initial);
      setHasInitializedFromProfile(true);
    }
  }, [catalog, currentSubjectIds, hasInitializedFromProfile]);

  // Helper: check if a subject matches current selections, optionally ignoring one facet
  const itemMatches = (item: SubjectCatalogItem, excludeFacet?: keyof FacetSelections): boolean => {
    // 1. Category
    if (excludeFacet !== 'category' && selections.category.length > 0) {
      if (!selections.category.some(c => c.toUpperCase() === item.category.toUpperCase())) return false;
    }

    // 2. Board
    if (excludeFacet !== 'board' && selections.board.length > 0) {
      if (!selections.board.some(b => b.toUpperCase() === item.board.toUpperCase())) return false;
    }

    // 3. Department
    if (excludeFacet !== 'department' && selections.department.length > 0) {
      if (!selections.department.some(d => d.toUpperCase() === item.department.toUpperCase())) return false;
    }

    // 4. Level
    if (excludeFacet !== 'level' && selections.level.length > 0) {
      if (!selections.level.some(l => l.toUpperCase() === item.level.toUpperCase())) return false;
    }

    // 5. Stage / Class
    if (excludeFacet !== 'stage' && selections.stage.length > 0) {
      if (!selections.stage.some(s => s.toUpperCase() === item.stage.toUpperCase())) return false;
    }

    // 6. Subject Name
    if (excludeFacet !== 'subjectName' && selections.subjectName.length > 0) {
      if (!selections.subjectName.some(n => n.toUpperCase() === item.name.toUpperCase())) return false;
    }

    return true;
  };

  // Compute available distinct options for each line with cascading
  const facetOptions = useMemo(() => {
    if (catalog.length === 0) {
      return {
        category: [] as { value: string; count: number }[],
        board: [] as { value: string; count: number }[],
        department: [] as { value: string; count: number }[],
        level: [] as { value: string; count: number }[],
        stage: [] as { value: string; count: number }[],
        subjectName: [] as { value: string; count: number }[]
      };
    }

    const computeFacet = (
      facetKey: keyof FacetSelections,
      getValue: (item: SubjectCatalogItem) => string,
      sortFn?: (a: string, b: string) => number
    ) => {
      const filtered = catalog.filter(item => itemMatches(item, facetKey));
      const counts: Record<string, number> = {};

      filtered.forEach(item => {
        const val = getValue(item);
        if (val) counts[val] = (counts[val] || 0) + 1;
      });

      const values = Object.keys(counts);
      if (sortFn) {
        values.sort(sortFn);
      } else {
        values.sort(naturalSort);
      }

      return values.map(val => ({
        value: val,
        count: counts[val]
      }));
    };

    return {
      category: computeFacet('category', i => i.category),
      board: computeFacet('board', i => i.board),
      department: computeFacet('department', i => i.department),
      level: computeFacet('level', i => i.level),
      stage: computeFacet('stage', i => i.stage, naturalSort),
      subjectName: computeFacet('subjectName', i => i.name, naturalSort)
    };
  }, [catalog, selections]);

  // Prune any selection that is no longer valid in cascaded options
  useEffect(() => {
    if (catalog.length === 0) return;

    let changed = false;
    const nextSelections: FacetSelections = { ...selections };

    const pruneKey = (key: keyof FacetSelections, available: { value: string }[]) => {
      const validSet = new Set(available.map(a => a.value.toUpperCase()));
      const filtered = nextSelections[key].filter(v => validSet.has(v.toUpperCase()));
      if (filtered.length !== nextSelections[key].length) {
        nextSelections[key] = filtered;
        changed = true;
      }
    };

    pruneKey('category', facetOptions.category);
    pruneKey('board', facetOptions.board);
    pruneKey('department', facetOptions.department);
    pruneKey('level', facetOptions.level);
    pruneKey('stage', facetOptions.stage);
    pruneKey('subjectName', facetOptions.subjectName);

    if (changed) {
      setSelections(nextSelections);
    }
  }, [facetOptions, catalog.length]);

  // All subjects that fall under the selected criteria
  const selectedSubjects = useMemo(() => {
    return catalog.filter(item => itemMatches(item));
  }, [catalog, selections]);

  // Check if current selection differs from teacher's saved profile subjects
  const isDirty = useMemo(() => {
    const currentSorted = (currentSubjectIds || []).slice().sort();
    const selectedSorted = selectedSubjects.map(s => s.id).slice().sort();

    if (currentSorted.length !== selectedSorted.length) return true;
    for (let i = 0; i < currentSorted.length; i++) {
      if (currentSorted[i] !== selectedSorted[i]) return true;
    }
    return false;
  }, [currentSubjectIds, selectedSubjects]);

  // Total active filter criteria chosen
  const hasActiveSelections =
    selections.category.length > 0 ||
    selections.board.length > 0 ||
    selections.department.length > 0 ||
    selections.level.length > 0 ||
    selections.stage.length > 0 ||
    selections.subjectName.length > 0;

  // Toggle selection for an option in a facet
  const toggleOption = (facet: keyof FacetSelections, val: string) => {
    setSelections(prev => {
      const current = prev[facet];
      const exists = current.some(v => v.toUpperCase() === val.toUpperCase());
      const updated = exists
        ? current.filter(v => v.toUpperCase() !== val.toUpperCase())
        : [...current, val];

      return {
        ...prev,
        [facet]: updated
      };
    });
  };

  // Select all options for a specific facet line
  const selectAll = (facet: keyof FacetSelections) => {
    const all = facetOptions[facet].map(o => o.value);
    setSelections(prev => ({
      ...prev,
      [facet]: all
    }));
  };

  // Clear selections for a specific facet line
  const clearFacet = (facet: keyof FacetSelections) => {
    setSelections(prev => ({
      ...prev,
      [facet]: []
    }));
  };

  // Reset to teacher's currently saved profile in database
  const resetToProfile = () => {
    const fromProfile = getSelectionsFromProfile(currentSubjectIds, catalog);
    setSelections(fromProfile);
  };

  // Clear all selections
  const clearAll = () => {
    setSelections(INITIAL_SELECTIONS);
  };

  // Save selection directly to teacher profile
  const handleSaveSelection = async () => {
    if (selectedSubjects.length === 0) {
      alert('No subjects match the selected criteria.');
      return;
    }

    try {
      setSaving(true);
      setSaveSuccessMessage('');

      const selectedIds = selectedSubjects.map(s => s.id);
      onSubjectsChange(selectedIds);
      await onSaveProfile(selectedIds);

      setSaveSuccessMessage(`${selectedIds.length} academic subjects saved successfully to your profile!`);
      setTimeout(() => setSaveSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to save selection:', err);
      alert('Failed to save subjects to profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render a single horizontal line row
  const renderRow = (
    title: string,
    facetKey: keyof FacetSelections,
    icon: React.ReactNode,
    options: { value: string; count: number }[]
  ) => {
    const selectedVals = selections[facetKey];

    return (
      <div className="py-4 border-b border-slate-200/80 last:border-b-0">
        {/* Row Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600">{icon}</span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              {title}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
              {selectedVals.length > 0 ? `${selectedVals.length} selected` : 'All'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold">
            {selectedVals.length > 0 ? (
              <button
                type="button"
                onClick={() => clearFacet(facetKey)}
                className="text-red-600 hover:underline"
              >
                Clear
              </button>
            ) : (
              <button
                type="button"
                onClick={() => selectAll(facetKey)}
                className="text-indigo-600 hover:underline"
              >
                Select All ({options.length})
              </button>
            )}
          </div>
        </div>

        {/* Straight Line of Options */}
        <div className="flex flex-wrap items-center gap-2">
          {options.map(opt => {
            const isSelected = selectedVals.some(v => v.toUpperCase() === opt.value.toUpperCase());
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleOption(facetKey, opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40'
                }`}
              >
                {isSelected && <Check size={13} strokeWidth={3} className="text-white" />}
                <span>{opt.value}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}

          {options.length === 0 && (
            <span className="text-xs text-slate-400 italic">No options available for current selection</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-slate-300 border-t-4 border-t-indigo-600 shadow-xl space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Academic Subject Selection</h3>
          <p className="text-[12px] font-bold text-slate-500 mt-0.5">
            Select your Board, Department, Level, Stage, and Subjects below. All matching subjects are automatically selected.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentSubjectIds && currentSubjectIds.length > 0 && (
            <button
              type="button"
              onClick={resetToProfile}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              title="Reset to your saved subjects in database"
            >
              <Undo2 size={14} /> Reset to My Saved Profile
            </button>
          )}

          {hasActiveSelections && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              <RotateCcw size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Loading & Error States */}
      {loadingCatalog && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500">
          <Loader2 size={32} className="animate-spin mb-2 text-indigo-600" />
          <p className="text-xs font-black uppercase tracking-widest">Loading Catalog Database...</p>
        </div>
      )}

      {loadError && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {!loadingCatalog && !loadError && (
        <div className="space-y-1">
          {/* 1. Category */}
          {renderRow('Category', 'category', <Sparkles size={16} />, facetOptions.category)}

          {/* 2. Board or Syllabus */}
          {renderRow('Board or Syllabus', 'board', <GraduationCap size={16} />, facetOptions.board)}

          {/* 3. Department (after Board or Syllabus) */}
          {renderRow('Department', 'department', <Tag size={16} />, facetOptions.department)}

          {/* 4. Level (after Department) */}
          {renderRow('Level', 'level', <Building2 size={16} />, facetOptions.level)}

          {/* 5. Stage or Class */}
          {renderRow('Stage or Class', 'stage', <Layers size={16} />, facetOptions.stage)}

          {/* 6. Subjects */}
          {renderRow('Subjects', 'subjectName', <BookOpen size={16} />, facetOptions.subjectName)}

          {/* Bottom Bar: Selection Summary & Right-aligned "Save Selection" button */}
          <div className="pt-6 mt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Summary of matching subjects */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-slate-900">
                  {selectedSubjects.length} Subjects Selected
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreviewList(!showPreviewList)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                >
                  {showPreviewList ? 'Hide List' : 'Preview List'}
                  {showPreviewList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                All {selectedSubjects.length} matching subjects will be saved to your profile on clicking Save.
              </p>
            </div>

            {/* Right: Save Selection button */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveSelection}
                disabled={saving || !isDirty || selectedSubjects.length === 0}
                className={`flex items-center justify-center gap-2 h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  isDirty && !saving && selectedSubjects.length > 0
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 shadow-md cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                }`}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'SAVING...' : isDirty ? 'SAVE SELECTION' : 'NO CHANGES'}
              </button>
            </div>
          </div>

          {/* Collapsible Preview List */}
          {showPreviewList && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-60 overflow-y-auto animate-in fade-in">
              <div className="flex flex-wrap gap-2">
                {selectedSubjects.map(sub => {
                  const isCurrentInProfile = currentSubjectIds && currentSubjectIds.includes(sub.id);
                  return (
                    <span
                      key={sub.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border transition-colors ${
                        isCurrentInProfile
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-950'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {isCurrentInProfile && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-600 text-white rounded">
                          ✓ Saved
                        </span>
                      )}
                      <span>{sub.label || sub.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">({sub.id})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default DynamicSubjectSelector;
