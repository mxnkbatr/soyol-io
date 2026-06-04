'use client';

import { useState, useEffect } from 'react';
import {
  Package, PlusCircle, Pencil, Trash2, Loader2,
  Tag, Layers, Save, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

type Subcategory = {
  id: string;
  name: string;
};

type Category = {
  _id: string;
  id: string; // slug
  name: string;
  icon: string; // emoji
  subcategories: Subcategory[];
  productCount?: number;
};

// --- Constants ---

const EMOJI_LIST = [
  '🏠', '💻', '👗', '🏡', '💄', '⚽', '🍼', '⌚', '📚', '🎮',
  '🎸', '📷', '🎬', '🎤', '🔌', '🖥️', '📱', '🎯', '🏋️', '🎪'
];

export default function AdminCategoriesPage() {
  // --- State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    icon: string;
    subcategories: Subcategory[];
  }>({
    name: '',
    icon: '📦',
    subcategories: [],
  });

  // Subcategory Input State
  const [newSubcatName, setNewSubcatName] = useState('');

  // --- Effects ---

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- Actions ---

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      } else {
        toast.error('Категори ачаалж чадсангүй');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Сервертэй холбогдоход алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Энэ категорийг устгахдаа итгэлтэй байна уу?')) return;

    // Optimistically remove the category from the UI
    setCategories(prev => prev.filter(cat => cat.id !== slug && cat._id !== slug));

    try {
      const res = await fetch(`/api/categories/${slug}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Категори устгагдлаа');
        fetchCategories();
      } else {
        toast.error('Устгахад алдаа гарлаа');
        fetchCategories(); // Re-fetch to revert the UI if deletion failed
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Сервертэй холбогдоход алдаа гарлаа');
      fetchCategories(); // Re-fetch to revert the UI if deletion failed
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Нэр оруулна уу');
      return;
    }
    if (!formData.icon) {
      toast.error('Icon сонгоно уу');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        icon: formData.icon,
        subcategories: formData.subcategories,
      };

      let res;
      if (editingCategory) {
        // Edit Mode (using slug as ID for update)
        res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create Mode
        res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(editingCategory ? 'Категори шинэчлэгдлээ' : 'Категори нэмэгдлээ');
        closeModal();
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Алдаа гарлаа');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Сервертэй холбогдоход алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Helpers ---

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        icon: category.icon,
        subcategories: category.subcategories || [],
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        icon: '🏠', // Default icon
        subcategories: [],
      });
    }
    setNewSubcatName('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const addSubcategory = () => {
    if (!newSubcatName.trim()) return;

    // Generate simple ID from name
    const id = newSubcatName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check for duplicate ID in current list
    if (formData.subcategories.some(sub => sub.id === id)) {
      toast.error('Ийм нэртэй дэд ангилал байна');
      return;
    }

    setFormData(prev => ({
      ...prev,
      subcategories: [...prev.subcategories, { id, name: newSubcatName.trim() }]
    }));
    setNewSubcatName('');
  };

  const removeSubcategory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter(sub => sub.id !== id)
    }));
  };

  // Filter categories
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 lg:hidden">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Ангилал удирдах</h1>
                <p className="text-xs text-slate-400 lg:block hidden">Барааны ангилал болон дэд ангилалууд</p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium shadow-lg shadow-amber-500/20 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Ангилал нэмэх</span>
              <span className="sm:hidden">Нэмэх</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Ачаалж байна...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {filteredCategories.map((category) => (
              <div
                key={category._id || category.id}
                className="bg-slate-900 rounded-2xl border border-white/5 p-5 hover:border-amber-500/30 transition-all group relative overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute -right-6 -top-6 text-[100px] opacity-[0.03] pointer-events-none select-none grayscale group-hover:grayscale-0 transition-all">
                  {category.icon}
                </div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-inner border border-white/5">
                    {category.icon}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openModal(category)}
                      className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Засах"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                      title="Устгах"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-1">{category.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mt-3">
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{category.subcategories?.length || 0} дэд ангилал</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg">
                      <Package className="w-3.5 h-3.5" />
                      <span>{category.productCount || 0} бараа</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-white">Ангилал олдсонгүй</h3>
                <p className="text-sm text-slate-500 mt-1">Шинэ ангилал нэмнэ үү.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#1E293B] z-10 shrink-0">
                <h2 className="text-lg font-bold text-white">
                  {editingCategory ? 'Ангилал засах' : 'Шинэ ангилал'}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-6">
                {/* Icon Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Icon сонгох</label>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {EMOJI_LIST.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${formData.icon === emoji
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ангиллын нэр</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-500/50 outline-none placeholder:text-slate-600 transition-all"
                    placeholder="Жишээ: Электрон бараа"
                  />
                </div>

                {/* Subcategories */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Дэд ангилалууд</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubcategory())}
                      className="flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-amber-500/50 outline-none placeholder:text-slate-600"
                      placeholder="Дэд ангиллын нэр..."
                    />
                    <button
                      type="button"
                      onClick={addSubcategory}
                      className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Нэмэх
                    </button>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                    {formData.subcategories.length === 0 ? (
                      <p className="text-xs text-slate-600 italic text-center py-2">Дэд ангилал байхгүй байна</p>
                    ) : (
                     {formData.subcategories.map((sub, index) => (
                        <div key={sub.id || `sub-${index}`} className="flex items-center justify-between bg-slate-800/50 px-3 py-2 rounded-lg border border-white/5">
                          <span className="text-sm text-slate-300">{sub.name}</span>
                          <button
                            onClick={() => removeSubcategory(sub.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-white/10 bg-[#1E293B] shrink-0">
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingCategory ? 'Шинэчлэх' : 'Хадгалах'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
}
