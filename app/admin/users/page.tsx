'use client';

import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { Loader2, Search, Shield, User, KeyRound, X, Eye, EyeOff, ArrowUpDown } from 'lucide-react';


const fetcher = (url: string) => fetch(url).then(r => r.json());

interface AdminUser {
    _id: string;
    name?: string;
    phone?: string;
    role: 'user' | 'admin';
    createdAt?: string;
}

export default function AdminUsersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc');

    // Password reset modal state
    const [passwordModal, setPasswordModal] = useState<{ user: AdminUser } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resettingId, setResettingId] = useState<string | null>(null);

    const { data, mutate, error } = useSWR('/api/admin/users', fetcher, { refreshInterval: 30000 });
    const loading = !data && !error;
    const allUsers: AdminUser[] = data?.users || [];

    const filteredUsers = allUsers
        .filter(u => {
            const term = searchTerm.toLowerCase();
            return (
                (u.name || '').toLowerCase().includes(term) ||
                (u.phone || '').toLowerCase().includes(term)
            );
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name_asc':
                    return (a.name || '').localeCompare(b.name || '', 'mn');
                case 'name_desc':
                    return (b.name || '').localeCompare(a.name || '', 'mn');
                case 'date_asc':
                    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                case 'date_desc':
                default:
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            }
        });

    const handleToggleRole = async (user: AdminUser) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        setTogglingId(user._id);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, role: newRole }),
            });
            const result = await res.json();
            if (res.ok) {
                toast.success(result.message || 'Эрх шинэчлэгдлээ');
                mutate();
            } else {
                toast.error(result.error || 'Алдаа гарлаа');
            }
        } catch {
            toast.error('Сервертэй холбогдож чадсангүй');
        } finally {
            setTogglingId(null);
        }
    };

    const openPasswordModal = (user: AdminUser) => {
        setPasswordModal({ user });
        setNewPassword('');
        setShowPassword(false);
    };

    const closePasswordModal = () => {
        setPasswordModal(null);
        setNewPassword('');
    };

    const handleResetPassword = async () => {
        if (!passwordModal) return;

        if (newPassword.length < 6) {
            toast.error('Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой');
            return;
        }

        setResettingId(passwordModal.user._id);
        try {
            const res = await fetch('/api/admin/users/password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: passwordModal.user._id, newPassword }),
            });
            const result = await res.json();
            if (res.ok) {
                toast.success(result.message || 'Нууц үг шинэчлэгдлээ');
                closePasswordModal();
            } else {
                toast.error(result.error || 'Алдаа гарлаа');
            }
        } catch {
            toast.error('Сервертэй холбогдож чадсангүй');
        } finally {
            setResettingId(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30">
                <div className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            Хэрэглэгчид
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
                                {allUsers.length}
                            </span>
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">Хэрэглэгчдийн эрх удирдах</p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        {/* Sort dropdown */}
                        <div className="relative flex-1 sm:flex-none">
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                            >
                                <option value="date_desc">Шинэ эхэнд</option>
                                <option value="date_asc">Хуучин эхэнд</option>
                                <option value="name_asc">Нэр А→Я</option>
                                <option value="name_desc">Нэр Я→А</option>
                            </select>
                            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Нэр эсвэл утсаар хайх..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-24">
                        <p className="text-slate-400">Мэдээлэл авахад алдаа гарлаа</p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE CARD LIST — md-с дээш нуугдана */}
                        <div className="md:hidden space-y-3 pb-20">
                            {filteredUsers.length === 0 ? (
                                <div className="py-20 text-center bg-slate-900 rounded-3xl border border-dashed border-slate-800 shadow-xl">
                                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <p className="text-slate-400 font-medium">Хэрэглэгч олдсонгүй</p>
                                    <p className="text-slate-600 text-sm mt-1">Хайлтын утгаа өөрчилж үзнэ үү</p>
                                </div>
                            ) : (
                                filteredUsers.map(user => {
                                    const isAdmin = user.role === 'admin';
                                    const isToggling = togglingId === user._id;

                                    return (
                                        <div
                                            key={user._id}
                                            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-amber-500/20' : 'bg-slate-800'}`}>
                                                        {isAdmin
                                                            ? <Shield className="w-4 h-4 text-amber-500" />
                                                            : <User className="w-4 h-4 text-slate-400" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-tight">{user.name || 'Нэргүй'}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">#{user._id.slice(-8).toUpperCase()}</p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${isAdmin
                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                                    }`}>
                                                    {isAdmin ? 'Админ' : 'Хэрэглэгч'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between text-xs border-t border-slate-800 pt-2 text-slate-400">
                                                <span>Утас:</span>
                                                <span className="font-mono font-bold text-white">{user.phone || '—'}</span>
                                            </div>

                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>Огноо:</span>
                                                <span className="font-medium text-slate-300">
                                                    {user.createdAt
                                                        ? new Date(user.createdAt).toLocaleDateString('mn-MN', {
                                                            year: 'numeric', month: '2-digit', day: '2-digit'
                                                        })
                                                        : '—'
                                                    }
                                                </span>
                                            </div>

                                            <div className="flex gap-2 pt-2 border-t border-slate-800">
                                                <button
                                                    onClick={() => openPasswordModal(user)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                                                >
                                                    <KeyRound className="w-3.5 h-3.5" />
                                                    Нууц үг
                                                </button>

                                                <button
                                                    onClick={() => handleToggleRole(user)}
                                                    disabled={isToggling}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-50 ${isAdmin
                                                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                                        }`}
                                                >
                                                    {isToggling ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : isAdmin ? (
                                                        <><User className="w-3.5 h-3.5" /> Хэрэглэгч</>
                                                    ) : (
                                                        <><Shield className="w-3.5 h-3.5" /> Админ</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* DESKTOP TABLE — mobile-д нуугдана */}
                        <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-950/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                                            <th className="px-6 py-4">Хэрэглэгч</th>
                                            <th className="px-6 py-4">Утас</th>
                                            <th className="px-6 py-4">Эрх</th>
                                            <th className="px-6 py-4">Бүртгэсэн огноо</th>
                                            <th className="px-6 py-4 text-right">Үйлдэл</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center">
                                                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Search className="w-6 h-6 text-slate-500" />
                                                    </div>
                                                    <p className="text-slate-400 font-medium">Хэрэглэгч олдсонгүй</p>
                                                    <p className="text-slate-600 text-sm mt-1">Хайлтын утгаа өөрчилж үзнэ үү</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map(user => {
                                                const isAdmin = user.role === 'admin';
                                                const isToggling = togglingId === user._id;

                                                return (
                                                    <tr key={user._id} className="hover:bg-slate-800/30 transition-colors group">
                                                        {/* Name */}
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-amber-500/20' : 'bg-slate-800'}`}>
                                                                    {isAdmin
                                                                        ? <Shield className="w-4 h-4 text-amber-500" />
                                                                        : <User className="w-4 h-4 text-slate-400" />
                                                                    }
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-white">{user.name || 'Нэргүй'}</p>
                                                                    <p className="text-xs text-slate-500 font-mono">{user._id.slice(-8).toUpperCase()}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Phone */}
                                                        <td className="px-6 py-4 text-sm font-mono text-slate-300">
                                                            {user.phone || '—'}
                                                        </td>

                                                        {/* Role Badge */}
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${isAdmin
                                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                                                }`}>
                                                                {isAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                                {isAdmin ? 'Админ' : 'Хэрэглэгч'}
                                                            </span>
                                                        </td>

                                                        {/* Created At */}
                                                        <td className="px-6 py-4 text-sm text-slate-400">
                                                            {user.createdAt
                                                                ? new Date(user.createdAt).toLocaleDateString('mn-MN', {
                                                                    year: 'numeric', month: '2-digit', day: '2-digit'
                                                                })
                                                                : '—'
                                                            }
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {/* Change Password */}
                                                                <button
                                                                    onClick={() => openPasswordModal(user)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                                                                >
                                                                    <KeyRound className="w-3 h-3" />
                                                                    Нууц үг
                                                                </button>

                                                                {/* Toggle Role */}
                                                                <button
                                                                    onClick={() => handleToggleRole(user)}
                                                                    disabled={isToggling}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border disabled:opacity-50 ${isAdmin
                                                                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                                                        }`}
                                                                >
                                                                    {isToggling ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : isAdmin ? (
                                                                        <><User className="w-3 h-3" /> Хэрэглэгч болгох</>
                                                                    ) : (
                                                                        <><Shield className="w-3 h-3" /> Админ болгох</>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Password Reset Modal */}
            {passwordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={closePasswordModal}
                    />

                    {/* Modal */}
                    <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        {/* Close */}
                        <button
                            onClick={closePasswordModal}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Title */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                <KeyRound className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Нууц үг шинэчлэх</h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {passwordModal.user.name || passwordModal.user.phone || 'Хэрэглэгч'}
                                </p>
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Шинэ нууц үг
                            </label>
                            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-4 h-[48px] focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
                                <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Хамгийн багадаа 6 тэмдэгт"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {newPassword.length > 0 && newPassword.length < 6 && (
                                <p className="text-xs text-red-400 mt-1.5 ml-1">Хамгийн багадаа 6 тэмдэгт байх ёстой</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={closePasswordModal}
                                className="flex-1 h-[44px] rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
                            >
                                Болих
                            </button>
                            <button
                                onClick={handleResetPassword}
                                disabled={!!resettingId || newPassword.length < 6}
                                className="flex-1 h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {resettingId ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : 'Хадгалах'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
