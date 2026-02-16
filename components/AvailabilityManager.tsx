
import React, { useState, useEffect, useCallback } from 'react';
import { WEEKDAYS, GOOGLE_FORMS } from '../constants';
import { subjectService } from '../services/subjectService';
import { availabilityService, TeacherAvailability } from '../services/availabilityService';
import { Plus, Trash2, BookOpen, Save, Search, Mail, ShieldCheck, Wallet, ArrowUpRight, TrendingUp, Phone, Clock, Layers, AlertCircle, MessageSquare, UserPlus, ChevronRight, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { TeacherProfile, Availability, SubjectCatalogItem } from '../types';
import ChangePasswordModal from './ChangePasswordModal';

interface AvailabilityManagerProps {
  profile: TeacherProfile;
  onUpdate: (profile: TeacherProfile) => void;
  onOpenCatalog: () => void;
}

const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({ profile, onUpdate, onOpenCatalog }) => {
  const [subjects, setSubjects] = useState<string[]>(profile.subjects);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [detailedSubjects, setDetailedSubjects] = useState<SubjectCatalogItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [originalAvailability, setOriginalAvailability] = useState<Availability[]>([]);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Time conversion helpers - Timezone-independent implementation
  const to24h = (apiTime: any) => {
    if (apiTime === undefined || apiTime === null || apiTime === "") return "09:00";

    try {
      // Handle Numbers (Google Sheets often returns time as a fraction of a day)
      if (typeof apiTime === 'number') {
        const totalMinutes = Math.round(apiTime * 24 * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      // Convert to string first to check format
      let timeStr = String(apiTime).trim();

      // Handle Date objects - Use local time
      if (apiTime instanceof Date && !isNaN(apiTime.getTime())) {
        return `${String(apiTime.getHours()).padStart(2, '0')}:${String(apiTime.getMinutes()).padStart(2, '0')}`;
      }

      // Handle ISO strings (e.g. 2024-01-01T09:00:00Z) - Parse to Local Time
      // We explicitly allow timezone conversion here to ensure UTC times from backend show as Local times
      if (timeStr.includes('T') || timeStr.includes('t')) {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
      }

      // Prepare for standard string parsing
      timeStr = timeStr.toLowerCase();

      // Handle standard time strings (e.g., "09:00", "9:00 am", "14:30", "9:0 PM")
      const match = timeStr.match(/(\d{1,2})[:.:](\d{1,2})(\s*(am|pm))?/);
      if (match) {
        let h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10);
        const modifier = match[4];

        if (modifier === 'pm' && h < 12) h += 12;
        if (modifier === 'am' && h === 12) h = 0;

        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      return "09:00";
    } catch (e) {
      console.error('Time conversion error:', e);
      return "09:00";
    }
  };

  const toApiTime = (time24h: string) => {
    if (!time24h) return "09:00 am";
    try {
      const [hours, minutes] = time24h.split(':');
      let h = parseInt(hours, 10);
      let m = parseInt(minutes, 10);
      let modifier = 'am';
      if (h >= 12) {
        modifier = 'pm';
        if (h > 12) h -= 12;
      }
      if (h === 0) h = 12;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${modifier}`;
    } catch (e) {
      return "09:00 am";
    }
  };

  const fetchAvailability = useCallback(async () => {
    if (!profile.id) return;
    try {
      setLoadingAvailability(true);
      const data = await availabilityService.getAvailability(profile.id);

      // Transform flat list to Availability[] structure
      const transformed: Availability[] = WEEKDAYS.map(day => ({
        day,
        slots: data
          .filter(item => {
            const weekday = item["Weekday"] || (item as any)["weekday"] || "";
            return weekday.toLowerCase() === day.toLowerCase();
          })
          .map(item => {
            const rawStart = item["Start Time"] || (item as any)["StartTime"] || (item as any)["start_time"];
            const rawEnd = item["End Time"] || (item as any)["EndTime"] || (item as any)["end_time"];
            const rawId = item["Available ID"] || (item as any)["AvailableID"] || (item as any)["available_id"];

            return {
              id: String(rawId || ""),
              start: to24h(rawStart),
              end: to24h(rawEnd)
            };
          })
      }));

      setAvailability(transformed);
      setOriginalAvailability(JSON.parse(JSON.stringify(transformed)));
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  }, [profile.id]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useEffect(() => {
    const fetchSubjectDetails = async () => {
      try {
        setLoadingSubjects(true);
        const data = await subjectService.getSubjectsByIds(subjects);

        // Transform API data to SubjectCatalogItem format
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
        setDetailedSubjects(transformed.filter(s => s.id));
      } catch (error) {
        console.error('Failed to fetch subject details:', error);
      } finally {
        setLoadingSubjects(false);
      }
    };

    if (subjects.length > 0) {
      fetchSubjectDetails();
    } else {
      setDetailedSubjects([]);
    }
  }, [subjects]);

  const addSlot = (day: string) => {
    setAvailability(prev => {
      return prev.map(a => a.day === day
        ? { ...a, slots: [...a.slots, { start: '09:00', end: '10:00' }] }
        : a
      );
    });
  };

  const updateSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => prev.map(a => a.day === day ? {
      ...a,
      slots: a.slots.map((s, i) => i === index ? { ...s, [field]: value } : s)
    } : a));
  };

  const removeSlot = (day: string, index: number) => {
    setAvailability(prev => prev.map(a => a.day === day ? {
      ...a,
      slots: a.slots.filter((_, i) => i !== index)
    } : a));
  };

  const handleSaveAvailability = async () => {
    // Validation
    for (const dayData of availability) {
      const sortedSlots = [...dayData.slots].sort((a, b) => a.start.localeCompare(b.start));

      for (let i = 0; i < sortedSlots.length; i++) {
        const slot = sortedSlots[i];

        // 1. Validate Start Time < End Time
        if (slot.start >= slot.end) {
          alert(`Validation Error on ${dayData.day}: Start time (${slot.start}) must be before end time (${slot.end}).`);
          return;
        }

        // 2. Validate Overlap
        if (i < sortedSlots.length - 1) {
          const nextSlot = sortedSlots[i + 1];
          if (slot.end > nextSlot.start) {
            alert(`Validation Error on ${dayData.day}: Slots overlap detected between ${slot.start}-${slot.end} and ${nextSlot.start}-${nextSlot.end}.`);
            return;
          }
        }
      }
    }

    try {
      setSavingAvailability(true);

      // Calculate diffs
      const toDelete: string[] = [];
      const toUpdate: { id: string; start: string; end: string; day: string }[] = [];
      const toAdd: { start: string; end: string; day: string }[] = [];

      // Check for deletions and updates
      originalAvailability.forEach(orig => {
        const curr = availability.find(a => a.day === orig.day);

        orig.slots.forEach(origSlot => {
          const currSlot = curr?.slots.find(s => s.id === origSlot.id);
          if (!currSlot) {
            if (origSlot.id) toDelete.push(origSlot.id);
          } else if (currSlot.start !== origSlot.start || currSlot.end !== origSlot.end) {
            if (origSlot.id) {
              toUpdate.push({
                id: origSlot.id,
                start: currSlot.start,
                end: currSlot.end,
                day: orig.day
              });
            }
          }
        });
      });

      // Check for additions
      availability.forEach(curr => {
        curr.slots.forEach(slot => {
          if (!slot.id) {
            toAdd.push({
              start: slot.start,
              end: slot.end,
              day: curr.day
            });
          }
        });
      });

      // Perform API calls
      const promises = [
        ...toDelete.map(id => availabilityService.deleteAvailability(id)),
        ...toUpdate.map(slot => availabilityService.updateAvailability(slot.id, {
          "Start Time": toApiTime(slot.start),
          "End Time": toApiTime(slot.end)
        })),
        ...toAdd.map(slot => availabilityService.addAvailability({
          "Teacher ID": profile.id,
          "Weekday": slot.day,
          "Start Time": toApiTime(slot.start),
          "End Time": toApiTime(slot.end)
        }))
      ];

      await Promise.all(promises);

      // Refresh after saving to get new IDs
      await fetchAvailability();

      onUpdate({ ...profile, availability });
      alert('Availability updated successfully!');
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Some changes could not be saved. Please try again.');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleSaveSubjects = async () => {
    try {
      setSavingSubjects(true);
      await onUpdate({ ...profile, subjects });
      alert('Academic subjects updated successfully!');
    } catch (error) {
      console.error('Failed to save subjects:', error);
      alert('Failed to update subjects. Please try again.');
    } finally {
      setSavingSubjects(false);
    }
  };

  const isSubjectsDirty = JSON.stringify(subjects) !== JSON.stringify(profile.subjects);

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">

      {/* Profile Header */}
      <section className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-navy/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-brand-navy rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-brand-navy/20">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-1">
              <h2 className="text-4xl font-black tracking-tight text-brand-navy leading-none">{profile.name}</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-navy/5 border border-brand-navy/10 rounded-full text-[9px] font-black uppercase tracking-widest text-brand-navy">
                <ShieldCheck size={11} strokeWidth={3} /> INSTITUTIONAL ID: {profile.id}
              </span>
              <button
                onClick={() => onUpdate({ ...profile, status: profile.status === 'Active' ? 'In-Active' : 'Active' })}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center ${profile.status === 'Active'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                  }`}
              >
                <div className={`w-2 h-2 rounded-full ${profile.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {profile.status || 'Active'}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-500 font-bold text-[13px] justify-center md:justify-start mt-3">
              {profile.email && profile.email.includes('@') && <span className="flex items-center gap-1.5"><Mail size={14} className="text-brand-navy/30" /> {profile.email}</span>}
              <span className="flex items-center gap-1.5"><Phone size={14} className="text-brand-navy/30" /> {profile.mobile}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Cards Grid - Hidden for future */}
      {/* 
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between group transition-all hover:border-green-100">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL EARNINGS</p>
            <span className="text-3xl font-black text-slate-900 tracking-tight">₹0.00</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 transition-transform group-hover:scale-110">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between group transition-all hover:border-brand-navy/10">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WITHDRAWALS</p>
            <span className="text-3xl font-black text-slate-900 tracking-tight">₹0.00</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-navy/5 flex items-center justify-center text-brand-navy transition-transform group-hover:scale-110">
            <ArrowUpRight size={24} />
          </div>
        </div>
      </section>
      */}

      {/* Forms & Requests Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Forms & Requests</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href={GOOGLE_FORMS.COMPLAINT}
            target="_blank"
            className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-red-100 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle size={20} />
              </div>
              <span className="text-sm font-bold text-slate-700">File Complaint</span>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href={GOOGLE_FORMS.FEEDBACK}
            target="_blank"
            className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-amber-100 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare size={20} />
              </div>
              <span className="text-sm font-bold text-slate-700">Give Feedback</span>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href={GOOGLE_FORMS.RESCHEDULE_REQUEST}
            target="_blank"
            className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-blue-100 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock size={20} />
              </div>
              <span className="text-sm font-bold text-slate-700">Reschedule Request</span>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href={GOOGLE_FORMS.REFER_FRIEND}
            target="_blank"
            className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-brand-navy/10 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-navy/5 text-brand-navy flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus size={20} />
              </div>
              <span className="text-sm font-bold text-slate-700">Refer a Friend</span>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* Security Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security & Privacy</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-brand-navy/10 transition-all flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-navy/5 text-brand-navy flex items-center justify-center group-hover:scale-110 transition-transform">
                <Lock size={20} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-700 block">Change Password</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update your security credentials</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          mobile={profile.mobile}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}

      {/* Academic Slots Section */}
      <section className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-sm relative overflow-hidden">
        {loadingAvailability && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-brand-navy mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading your schedule...</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Academic Slots</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">DEFINE YOUR WEEKLY AVAILABILITY</p>
          </div>
          <button
            onClick={handleSaveAvailability}
            disabled={savingAvailability || loadingAvailability}
            className="bg-brand-navy text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 active:scale-95 transition-all shadow-xl shadow-brand-navy/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] justify-center"
          >
            {savingAvailability ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {savingAvailability ? 'Committing...' : 'Commit Changes'}
          </button>
        </div>

        <div className="divide-y divide-slate-50 border border-slate-100 rounded-3xl overflow-hidden bg-slate-50/20">
          {WEEKDAYS.map(day => {
            const dayData = availability.find(a => a.day === day);
            return (
              <div key={day} className="flex flex-col md:flex-row items-stretch md:items-center transition-colors hover:bg-white group">
                <div className="md:w-44 px-8 py-5 border-b md:border-b-0 md:border-r border-slate-100 flex items-center justify-between md:justify-start">
                  <span className="font-black text-slate-800 tracking-tight text-sm uppercase group-hover:text-brand-navy transition-colors">{day}</span>
                  <div className="md:hidden">
                    <button onClick={() => addSlot(day)} className="p-2 text-brand-navy"><Plus size={18} /></button>
                  </div>
                </div>

                <div className="flex-1 px-8 py-4 flex flex-wrap items-center gap-3">
                  {dayData?.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:border-brand-navy/30 transition-all group/slot">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateSlot(day, idx, 'start', e.target.value)}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none"
                      />
                      <div className="w-2 h-[2px] bg-slate-200" />
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(day, idx, 'end', e.target.value)}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none"
                      />
                      <button
                        onClick={() => removeSlot(day, idx)}
                        className="text-slate-300 hover:text-red-500 transition-colors ml-1 p-1 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {(!dayData || dayData.slots.length === 0) ? (
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic py-2">Unassigned</span>
                  ) : null}

                  <button
                    onClick={() => addSlot(day)}
                    className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-brand-navy hover:text-brand-navy transition-all ml-2"
                  >
                    <Plus size={16} /> ADD SLOT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Academic Subjects Section - Updated to Deck View Format */}
      <section className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 px-2">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Academic Subjects</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Subjects currently indexed for your profile</p>
          </div>
          <div className="flex items-center gap-3">
            {isSubjectsDirty && (
              <button
                onClick={handleSaveSubjects}
                disabled={savingSubjects || loadingSubjects}
                className="flex items-center justify-center gap-3 bg-brand-navy text-white h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-brand-navy/10 hover:bg-slate-900 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSubjects ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {savingSubjects ? 'COMMITTING...' : 'COMMIT CHANGES'}
              </button>
            )}
            <button
              onClick={onOpenCatalog}
              className="flex items-center justify-center gap-3 bg-brand-navy/5 text-brand-navy h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all border border-brand-navy/10 hover:bg-brand-navy/10 group"
            >
              <Search size={18} className="group-hover:scale-110 transition-transform" /> SEARCH CATALOG
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loadingSubjects ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={40} className="animate-spin mb-4 text-brand-navy" />
              <p className="text-xs font-black uppercase tracking-widest">Sycnchronizing Catalog...</p>
            </div>
          ) : detailedSubjects.map(sub => (
            <div
              key={sub?.id}
              className="group relative bg-[#F8FAFC] border border-slate-100 p-5 rounded-2xl hover:bg-white hover:border-brand-navy/20 transition-all duration-300 flex items-start gap-4 h-auto shadow-sm hover:shadow-xl hover:shadow-brand-navy/5"
            >
              {/* LEADING (Leading Icon) */}
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-navy border border-slate-100 shadow-sm group-hover:bg-brand-navy group-hover:text-white transition-all shrink-0">
                <BookOpen size={24} />
              </div>

              {/* CENTER (Title, Subtitle, Chips) */}
              <div className="flex-1 min-w-0 pr-10">
                <div className="flex flex-col gap-1 mb-3">
                  <h4 className="font-black text-slate-800 text-base leading-none group-hover:text-brand-navy transition-colors truncate">
                    {sub?.name || 'Academic Subject'}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-400 leading-relaxed line-clamp-1">
                    {sub?.description || '.'}
                  </p>
                </div>

                {/* CHIPS AREA - requested format */}
                <div className="flex flex-wrap gap-1.5">
                  {sub?.stage && (
                    <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.stage}</span>
                  )}
                  {sub?.department && sub.department !== 'General' && (
                    <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.department}</span>
                  )}
                  {sub?.board && (
                    <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.board}</span>
                  )}
                  {sub?.level && (
                    <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.level}</span>
                  )}
                  {sub?.category && (
                    <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.category}</span>
                  )}
                  {sub?.code && (
                    <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md uppercase tracking-widest">{sub.code}</span>
                  )}
                  {sub?.tags && sub.tags.map((tag, i) => (
                    <span key={i} className="text-[8px] font-black px-2 py-0.5 bg-blue-50 text-brand-navy rounded-md uppercase tracking-widest">{tag}</span>
                  ))}
                </div>
              </div>

              {/* TRAILING (Delete Action) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSubjects(prev => prev.filter(id => id !== sub?.id));
                }}
                className="absolute top-5 right-5 p-2 text-slate-300 hover:text-red-500 transition-colors hover:bg-red-50 rounded-xl group-hover:opacity-100 md:opacity-0"
                title="Remove from profile"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {subjects.length === 0 && (
            <div className="col-span-full py-24 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <BookOpen size={40} className="opacity-20" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-[0.2em]">No Academic Subjects Indexed</p>
              <button onClick={onOpenCatalog} className="mt-4 text-brand-navy font-black text-[10px] uppercase tracking-widest hover:underline decoration-2 underline-offset-8">Open Catalog</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AvailabilityManager;
