'use client';

import React, { useState, useEffect, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/clientAuth';
import { buildAdminCallIdentity } from '@/lib/livekitRoom';
import { useRouter } from 'next/navigation';
import { 
  LiveKitRoom, 
  VideoConference, 
  useRoomContext,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import { ArrowLeft, Loader2, AlertCircle, Radio, PhoneOff } from 'lucide-react';

function AdminRoomWatcher({ unitId }: { unitId: string }) {
  const room = useRoomContext();
  const router = useRouter();

  useEffect(() => {
    const handleParticipantDisconnected = (participant: any) => {
      if (participant.identity.startsWith('unit-')) {
        console.log('Unit disconnected, exiting call...');
        router.push('/admin/video');
      }
    };

    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, router]);

  return null;
}

export default function AdminCallPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomName = unitId.startsWith('support-') ? unitId : `room-${unitId}`;
  const identity = user?.id ? buildAdminCallIdentity(user.id) : 'admin-unknown';

  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Use the POST endpoint which is already correctly set up
        const res = await authFetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            identity,
            displayName: user?.name || 'Admin',
          }),
        });
        
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to get token');
        }
        const data = await res.json();
        setToken(data.token);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchToken();
  }, [roomName, identity, user?.name]);

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-red-500 bg-[#080c0a] p-8">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-lg font-black uppercase tracking-widest mb-2">Connection Failed</h2>
        <p className="text-xs text-red-400/70 mb-8">{error}</p>
        <button 
          onClick={() => router.push('/admin/video')}
          className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white rounded-2xl font-black text-xs uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-emerald-500 bg-[#080c0a]">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Establishing Secure Link...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#080c0a] safe-area-inset-bottom">
      {/* Call Header */}
      <header className="h-14 md:h-16 border-b border-emerald-900/30 flex items-center justify-between px-4 md:px-6 bg-slate-900/40 backdrop-blur-md z-50">
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
          <button 
            onClick={() => router.push('/admin/video')}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest truncate">Шууд дуудлага</span>
            </div>
            <span className="text-xs md:text-sm font-bold text-white tracking-tight truncate">{unitId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase">Live</span>
          </div>
          
          <button 
            onClick={() => router.push('/admin/video')}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-red-500/20"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase">Дуусгах</span>
          </button>
        </div>
      </header>

      {/* Video Area */}
      <div className="flex-1 relative overflow-hidden">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          data-lk-theme="default"
          className="h-full"
          options={{
            adaptiveStream: true,
            dynacast: true,
            publishDefaults: {
              videoEncoding: {
                maxBitrate: 3_000_000, // Increase max bitrate to 3Mbps for better quality
                maxFramerate: 30,
              },
              screenShareEncoding: {
                maxBitrate: 3_000_000,
                maxFramerate: 15,
              },
            },
            videoCaptureDefaults: {
              resolution: {
                width: 1280,
                height: 720,
                frameRate: 30,
              },
            },
          }}
        >
          <VideoConference />
          <RoomAudioRenderer />
          <AdminRoomWatcher unitId={unitId} />
        </LiveKitRoom>
      </div>

      <style jsx global>{`
        .lk-video-conference { 
          background-color: #080c0a !important; 
          height: 100% !important;
        }
        .lk-video-conference-inner {
          padding: 8px !important;
        }
        .lk-control-bar { 
          background-color: rgba(15, 23, 20, 0.9) !important; 
          border-top: 1px solid rgba(16, 185, 129, 0.1) !important; 
          backdrop-filter: blur(10px); 
          padding: 12px !important;
          height: auto !important;
        }
        .lk-button { 
          border-radius: 12px !important; 
          font-family: var(--font-jetbrains), monospace !important; 
          font-weight: 800 !important; 
          text-transform: uppercase !important; 
          font-size: 10px !important; 
          padding: 10px !important;
          min-width: 44px !important;
          min-height: 44px !important;
        }
        .lk-button-primary { background-color: #10b981 !important; color: #080c0a !important; }
        .lk-participant-name { 
          font-family: var(--font-jetbrains), monospace !important; 
          font-size: 9px !important; 
          text-transform: uppercase !important; 
          font-weight: 700 !important; 
          color: #10b981 !important; 
          background: rgba(0,0,0,0.5) !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
        }
        .lk-focus-layout { background: #080c0a !important; }
        .lk-grid-layout { 
          background: #080c0a !important; 
          gap: 8px !important;
          padding: 8px !important;
        }
        .lk-participant-tile {
          border-radius: 16px !important;
          overflow: hidden !important;
          border: 1px solid rgba(16, 185, 129, 0.1) !important;
        }
        
        @media (max-width: 768px) {
          .lk-control-bar {
            padding-bottom: env(safe-area-inset-bottom, 20px) !important;
          }
          .lk-button-group {
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
