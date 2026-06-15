'use client';

import { useEffect, useState } from 'react';
import { Bell, Send, Loader2, Smartphone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

type BroadcastHistory = {
  _id: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
};

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('/');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/admin/broadcast');
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history || []);
      }
    } catch {
      toast.error('Түүх татахад алдаа гарлаа');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Гарчиг болон текст оруулна уу');
      return;
    }

    const confirmed = confirm(
      `Бүх хэрэглэгчийн утсанд мэдэгдэл илгээх үү?\n\n"${title}"\n${message}`,
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), link: link.trim() || '/' }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Илгээхэд алдаа гарлаа');
        return;
      }

      const sent = data.fcm?.multicast?.successCount ?? 0;
      toast.success(`Мэдэгдэл илгээгдлээ (${sent} утас)`);
      setTitle('');
      setMessage('');
      setLink('/');
      loadHistory();
    } catch {
      toast.error('Сүлжээний алдаа');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 h-full overflow-y-auto scrollbar-hide bg-slate-950 pb-24 lg:pb-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Bell className="w-7 h-7 text-amber-500" />
          Мэдэгдэл илгээх
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Бүх хэрэглэгчийн гар утсанд push мэдэгдэл илгээнэ. Апп хаалттай байсан ч харагдана.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Шинэ мэдэгдэл</h2>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Гарчиг *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Жишээ: 🔥 Өнөөдрийн хямдрал!"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
            <p className="text-[10px] text-slate-600 mt-1 text-right">{title.length}/80</p>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Текст *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Жишээ: Зөвхөн өнөөдөр 50% хямдрал! Одоо үзээрэй."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
            />
            <p className="text-[10px] text-slate-600 mt-1 text-right">{message.length}/300</p>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">Холбоос (заавал биш)</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/sale эсвэл /"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {sending ? 'Илгээж байна...' : 'Бүх хэрэглэгчид илгээх'}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Утсан дээрх харагдах байдал
            </h2>
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm">S</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 font-bold">Soyol Shop · одоо</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">
                    {title || '🔔 Гарчиг энд харагдана'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-3">
                    {message || 'Мэдэгдлийн текст энд харагдана...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200/80 space-y-1">
            <p>✅ Шинэ бараа нэмэхэд автоматаар мэдэгдэл илгээгддэг</p>
            <p>✅ Захиалгын төлөв өөрчлөгдөхөд тухайн хэрэглэгчид мэдэгдэл очно</p>
            <p>✅ Эндээс бичсэн мэдэгдэл бүх хэрэглэгчид очно</p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Сүүлийн илгээсэн мэдэгдлүүд
        </h2>

        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Одоогоор илгээгдээгүй</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item._id}
                className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.message}</p>
                  {item.link && item.link !== '/' && (
                    <p className="text-[10px] text-amber-500/70 mt-1">{item.link}</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleString('mn-MN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
