
import React, { useState } from 'react';
import { X, Lock, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { teacherService } from '../services/teacherService';

interface ChangePasswordModalProps {
    mobile: string;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ mobile, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Verify current password by fetching teacher data
            const teacherData = await teacherService.getTeacherByContact(mobile);

            if (!teacherData) {
                setError('Failed to verify account details');
                setIsLoading(false);
                return;
            }

            if (String(teacherData['Password']) !== String(currentPassword)) {
                setError('Current password is incorrect');
                setIsLoading(false);
                return;
            }

            // 2. Update password
            const success = await teacherService.updateTeacher(mobile, {
                "Password": newPassword
            });

            if (success) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setError('Failed to update password. Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-brand-navy p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck size={100} />
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                        <Lock size={24} />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">Access Control</h3>
                    <p className="text-white/60 font-bold text-xs uppercase tracking-widest mt-1">Update Security Credentials</p>
                </div>

                {/* Body */}
                <div className="p-8">
                    {success ? (
                        <div className="py-10 text-center animate-in fade-in zoom-in">
                            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <CheckCircle2 size={40} />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 mb-2">Password Updated!</h4>
                            <p className="text-slate-400 font-bold text-sm">Your new credentials are now active.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CURRENT PASSWORD</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NEW PASSWORD</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CONFIRM NEW PASSWORD</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-brand-navy/5 focus:border-brand-navy/20 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <p className="text-xs font-bold leading-tight">{error}</p>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 bg-brand-navy text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-navy/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:bg-slate-900 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" /> Verifying...
                                        </>
                                    ) : (
                                        <>
                                            Commit New Password <CheckCircle2 size={18} strokeWidth={3} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
