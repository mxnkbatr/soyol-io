'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, MoveUp, MoveDown, Image as ImageIcon, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { Reorder } from 'framer-motion';
import { Banner } from '@/models/Banner';
import AdminImageUpload from '@/components/admin/AdminImageUpload';

export default function BannerAdminPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
    const [editBannerData, setEditBannerData] = useState<Partial<Banner>>({});
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [newBanner, setNewBanner] = useState<Partial<Banner>>({
        image: '',
        title: '',
        link: '',
        active: true,
        order: 0
    });

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await fetch('/api/banners?all=true');
            const data = await res.json();
            // On admin we want all banners, not just active ones. 
            // Need a separate admin API or query param?
            // Let's modify the GET API to allow fetching all.
            setBanners(data.banners || []);
        } catch (err) {
            toast.error('Беннер татахад алдаа гарлаа');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddBanner = async () => {
        if (!newBanner.image) {
            toast.error('Зургийн URL оруулна уу');
            return;
        }

        try {
            const res = await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBanner),
            });

            if (res.ok) {
                toast.success('Беннер амжилттай нэмэгдлээ');
                setIsAdding(false);
                setNewBanner({ image: '', title: '', link: '', active: true, order: banners.length });
                fetchBanners();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || 'Хадгалахад алдаа гарлаа');
            }
        } catch (err) {
            toast.error('Алдаа гарлаа');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Устгахдаа итгэлтэй байна уу?')) return;

        try {
            const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Устгагдлаа');
                fetchBanners();
            }
        } catch (err) {
            toast.error('Алдаа гарлаа');
        }
    };

    const handleToggleActive = async (banner: Banner) => {
        try {
            const res = await fetch(`/api/banners/${banner.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !banner.active }),
            });
            if (res.ok) fetchBanners();
        } catch (err) {
            toast.error('Алдаа гарлаа');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingBannerId) return;
        try {
            const res = await fetch(`/api/banners/${editingBannerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editBannerData),
            });
            if (res.ok) {
                toast.success('Амжилттай хадгаллаа');
                setEditingBannerId(null);
                fetchBanners();
            }
        } catch (err) {
            toast.error('Алдаа гарлаа');
        }
    };

    const handleReorder = async (reorderedBanners: Banner[]) => {
        setBanners(reorderedBanners);
    };

    const saveNewOrder = async () => {
        setIsSavingOrder(true);
        try {
            await Promise.all(banners.map((b, idx) =>
                fetch(`/api/banners/${b.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order: idx }),
                })
            ));
            toast.success('Дараалал хадгалагдлаа');
        } catch (err) {
            toast.error('Дараалал хадгалж чадсангүй');
        } finally {
            setIsSavingOrder(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Беннер удирдлага</h1>
                    <p className="text-gray-500 mt-1">Нүүр хуудасны слайдер беннерүүдийг эндээс удирдана.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-[#FF5000] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Беннер нэмэх
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Шинэ беннер</h2>
                        <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Зураг оруулах <span className="text-red-500">*</span></label>
                                <AdminImageUpload
                                    value={newBanner.image || ''}
                                    onChange={(url) => setNewBanner({ ...newBanner, image: url })}
                                    folder="banners"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Гарчиг (Заавал биш)</label>
                                <input
                                    type="text"
                                    value={newBanner.title}
                                    onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Холбоос (Заавал биш)</label>
                                <input
                                    type="text"
                                    value={newBanner.link}
                                    onChange={(e) => setNewBanner({ ...newBanner, link: e.target.value })}
                                    placeholder="/product/..."
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-4 pt-8">
                                <button
                                    onClick={handleAddBanner}
                                    className="flex-1 bg-gray-900 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all shadow-lg"
                                >
                                    Хадгалах
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Одоогийн беннерүүд</h2>
                {banners.length > 0 && (
                    <button
                        onClick={saveNewOrder}
                        disabled={isSavingOrder}
                        className="text-sm font-bold text-orange-600 hover:text-white hover:bg-orange-500 px-4 py-2 rounded-lg border border-orange-200 hover:border-orange-500 transition-all disabled:opacity-50"
                    >
                        {isSavingOrder ? 'Хадгалж байна...' : 'Дараалал хадгалах'}
                    </button>
                )}
            </div>

            {banners.length > 0 ? (
                <Reorder.Group axis="y" values={banners} onReorder={handleReorder} className="space-y-4">
                    {banners.map((banner) => (
                        <Reorder.Item key={banner.id} value={banner} className="relative bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center p-3 gap-4 group hover:shadow-md transition-shadow">

                            <div className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600">
                                <GripVertical className="w-5 h-5" />
                            </div>

                            <div className="w-32 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                {banner.image ? (
                                    <img src={banner.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                )}
                            </div>

                            {editingBannerId === banner.id ? (
                                <div className="flex-1 grid grid-cols-2 gap-3 mr-4">
                                    <input
                                        type="text"
                                        value={editBannerData.title || ''}
                                        onChange={(e) => setEditBannerData({ ...editBannerData, title: e.target.value })}
                                        placeholder="Гарчиг"
                                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={editBannerData.link || ''}
                                        onChange={(e) => setEditBannerData({ ...editBannerData, link: e.target.value })}
                                        placeholder="Холбоос"
                                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate">{banner.title || 'Гарчиггүй'}</h3>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{banner.link || 'Холбоосгүй'}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                {editingBannerId === banner.id ? (
                                    <>
                                        <button onClick={handleSaveEdit} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg">
                                            <Save className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setEditingBannerId(null)} className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleToggleActive(banner)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${banner.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            {banner.active ? 'Идэвхтэй' : 'Идэвхгүй'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingBannerId(banner.id);
                                                setEditBannerData(banner);
                                            }}
                                            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(banner.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            ) : null}

            {banners.length === 0 && !isLoading && (
                <div className="text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">Беннер байхгүй байна</p>
                </div>
            )}
        </div>
    );
}
