'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Phone, Activity, Clock, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';

interface RoomData {
  name: string;
  unitId?: string;
  clientId?: string;
  numParticipants: number;
  creationTime: number;
}

export default function AdminVideoDashboard() {
  const router = useRouter();
  const [data, setData] = useState<{ unitRooms: RoomData[], supportRooms: RoomData[] }>({ unitRooms: [], supportRooms: [] });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/livekit/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/video/history');
      if (res.ok) {
        const json = await res.json();
        setHistory(json);
      }
    } catch (err) {
      console.error('Failed to fetch call history:', err);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchHistory();
    const interval = setInterval(() => {
      fetchRooms();
      fetchHistory();
    }, 5000);
    const tickInterval = setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(tickInterval);
    };
  }, [fetchRooms, fetchHistory]);

  const formatElapsed = (creationTime: number) => {
    const elapsedMs = Date.now() - (creationTime * 1000);
    const s = Math.floor((elapsedMs / 1000) % 60);
    const m = Math.floor((elapsedMs / (1000 * 60)) % 60);
    const h = Math.floor((elapsedMs / (1000 * 60 * 60)));
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };

  if (loading && !data.unitRooms.length && !data.supportRooms.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-emerald-500">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-xs tracking-widest uppercase">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-900/30 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Activity className="text-emerald-500 w-6 h-6" />
            COMMAND CENTER
          </h1>
          <p className="text-[10px] text-emerald-500/50 uppercase tracking-[0.2em] mt-1">Live Video Monitoring System</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-emerald-500/50 uppercase">Active Units</span>
            <span className="text-xl font-bold text-white">{data.unitRooms.length}</span>
          </div>
          {data.supportRooms.length > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-orange-500/50 uppercase">Support Waiting</span>
              <span className="text-xl font-bold text-orange-500 animate-pulse">{data.supportRooms.length}</span>
            </div>
          )}
          <button 
            onClick={() => { setLoading(true); fetchRooms(); }}
            className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-500 transition-colors border border-emerald-500/20"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between text-red-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-xs uppercase font-bold tracking-wider">System Error: {error}</p>
          </div>
          <button onClick={fetchRooms} className="text-[10px] underline uppercase font-black">Retry Connection</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Support Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className={`w-2 h-2 rounded-full ${data.supportRooms.length > 0 ? 'bg-orange-500 animate-pulse' : 'bg-slate-800'}`} />
            <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest">Хүлээж буй дуудлагууд</h2>
          </div>

          <div className="space-y-3">
            {data.supportRooms.length === 0 ? (
              <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-8 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">No active support requests</p>
              </div>
            ) : (
              data.supportRooms.map(room => (
                <div key={room.name} className="bg-orange-500/5 border border-orange-500/20 p-5 rounded-2xl flex items-center justify-between group hover:border-orange-500/40 transition-all">
                  <div className="space-y-1">
                    <p className="text-[10px] text-orange-500/50 uppercase font-bold">Client ID</p>
                    <p className="text-white font-bold">{room.clientId}</p>
                    <div className="flex items-center gap-3 text-[10px] text-orange-500/70 font-medium">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatElapsed(room.creationTime)}</span>
                      <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {room.numParticipants} active</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push(`/admin/call/support-${room.clientId}`)}
                    className="bg-orange-500 text-slate-950 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/20"
                  >
                    Хариулах
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Units Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className={`w-2 h-2 rounded-full ${data.unitRooms.length > 0 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
            <h2 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Unit Dashboard</h2>
          </div>

          <div className="space-y-3">
            {data.unitRooms.length === 0 ? (
              <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-8 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">No online units</p>
              </div>
            ) : (
              data.unitRooms.map(room => (
                <div key={room.name} className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/40 transition-all">
                  <div className="space-y-1">
                    <p className="text-[10px] text-emerald-500/50 uppercase font-bold">Unit ID</p>
                    <p className="text-white font-bold">{room.unitId}</p>
                    <div className="flex items-center gap-3 text-[10px] text-emerald-500/70 font-medium">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatElapsed(room.creationTime)}</span>
                      <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {room.numParticipants} active</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push(`/admin/call/${room.unitId}`)}
                    className="bg-emerald-500 text-slate-950 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Орох
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Call History Section */}
      <section className="space-y-4 pt-8">
        <div className="flex items-center gap-2 px-2 border-t border-white/5 pt-8">
          <div className="w-2 h-2 rounded-full bg-slate-500" />
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Дуудлагын түүх</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.length === 0 ? (
            <div className="col-span-full bg-slate-900/30 border border-white/5 rounded-2xl p-8 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Түүх байхгүй байна</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item._id} className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:border-white/10 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${item.type === 'call_invite' ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-500/10 text-slate-500'}`}>
                      {item.type === 'call_invite' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">{item.senderName}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{item.body || item.content || 'Видео дуудлага эхэлсэн'}</p>
                {item.roomName && (
                  <div className="mt-1 pt-2 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter">Room: {item.roomName}</span>
                    <button 
                      onClick={() => router.push(`/admin/call/${item.roomName}`)}
                      className="text-[9px] text-emerald-500 font-black uppercase hover:text-emerald-400 transition-colors"
                    >
                      Дахин орох
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <style jsx global>{`
        body { background-color: #080c0a; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
