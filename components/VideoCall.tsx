'use client';

import { useState, useCallback } from 'react';
import { Video, Phone, ArrowLeft, Loader2, Ban, PhoneOff } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useParticipants
} from '@livekit/components-react';
import '@livekit/components-styles';

export interface VideoCallProps {
  prefilledRoom?: string;
  onBack?: () => void;
  onDisconnected?: () => void;
  initialVideoDisabled?: boolean;
}

export default function VideoCall({ 
  prefilledRoom, 
  onBack, 
  onDisconnected,
  initialVideoDisabled = false
}: VideoCallProps) {
  const [room, setRoom] = useState(prefilledRoom || '');
  const [inCall, setInCall] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [token, setToken] = useState('');
  const [identity, setIdentity] = useState('');

  const connectToRoom = async () => {
    const roomName = room.trim();
    if (!roomName) { toast.error('Өрөөний нэр оруулна уу'); return; }

    setConnecting(true);
    const userIdentity = `user_${Math.floor(Math.random() * 10000)}`;
    setIdentity(userIdentity);

    try {
      const res = await fetch(`/api/livekit?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(userIdentity)}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setToken(data.token);
      setInCall(true);
      toast.success('Дуудлагад нэгдлээ!');
    } catch (err) {
      toast.error('Холбогдож чадсангүй. Дахин оролдоно уу.');
    } finally {
      setConnecting(false);
    }
  };

  const onLeave = useCallback(async () => {
    setInCall(false);
    setToken('');
    toast('Дуудлага дууслаа', { icon: '📵' });
    onDisconnected?.();
  }, [onDisconnected]);

  // If we have token and we are in call
  if (inCall && token) {
    return (
      <div className="relative h-full w-full bg-black overflow-hidden rounded-[2.5rem] safe-area-inset-bottom">
        <LiveKitRoom
          video={!initialVideoDisabled}
          audio={true}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          data-lk-theme="default"
          onDisconnected={onLeave}
          style={{ height: '100%', width: '100%' }}
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
          {/* Default UI with custom top bar to show Room name / Kick capability */}
          <VideoConference />
          <RoomAudioRenderer />
          
          {/* Custom Overlay for Ban Feature */}
          <BanControls currentRoom={room} currentIdentity={identity} />
          
          {/* Explicit Hang Up Button for Mobile */}
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={onLeave}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95 border border-white/10"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="hidden sm:inline">Дуусгах</span>
            </button>
          </div>
          
        </LiveKitRoom>

        <style jsx global>{`
          .lk-video-conference { 
            background-color: #000 !important; 
            height: 100% !important;
          }
          .lk-video-conference-inner {
            padding: 8px !important;
          }
          .lk-control-bar { 
            background-color: rgba(15, 23, 42, 0.9) !important; 
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important; 
            backdrop-filter: blur(10px); 
            padding: 12px !important;
            height: auto !important;
          }
          .lk-button { 
            border-radius: 12px !important; 
            font-weight: 600 !important; 
            font-size: 11px !important; 
            padding: 10px !important;
            min-width: 44px !important;
            min-height: 44px !important;
          }
          .lk-button-primary { 
            background-color: #f97316 !important; 
            color: #fff !important; 
          }
          .lk-participant-name { 
            font-size: 10px !important; 
            font-weight: 600 !important; 
            background: rgba(0,0,0,0.6) !important;
            padding: 4px 8px !important;
            border-radius: 8px !important;
            backdrop-filter: blur(4px);
          }
          .lk-grid-layout { 
            gap: 8px !important;
            padding: 8px !important;
          }
          .lk-participant-tile {
            border-radius: 20px !important;
            overflow: hidden !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
          }
          
          @media (max-width: 768px) {
            .lk-control-bar {
              padding-bottom: env(safe-area-inset-bottom, 24px) !important;
            }
            .lk-button-group {
              gap: 10px !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // Pre-call UI
  return (
    <div className="h-full flex items-center justify-center p-4 bg-transparent">
      <div className="w-full max-w-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Буцах</span>
          </button>
        )}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {initialVideoDisabled ? (
              <Phone className="w-8 h-8 text-orange-500" />
            ) : (
              <Video className="w-8 h-8 text-orange-500" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            {initialVideoDisabled ? 'Дуут дуудлага' : 'Видео дуудлага'}
          </h1>
          <p className="text-slate-400 text-sm">Өрөөний нэр оруулж дуудлага эхлүүлнэ үү</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-3xl border border-white/10 p-6 shadow-xl space-y-4">
           <div>
            <label htmlFor="room-input" className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              Өрөөний нэр
            </label>
            <input
              id="room-input"
              type="text"
              value={room}
              onChange={e => setRoom(e.target.value)}
              placeholder="my-room-123"
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-base"
            />
            <p className="mt-2 text-[10px] text-slate-500">Нөгөө хүнтэйгээ адил нэр ашиглана уу</p>
          </div>

          <button
            onClick={connectToRoom}
            disabled={connecting || !room.trim()}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            {connecting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Холбогдож байна...</span></>
            ) : (
              <><Phone className="w-5 h-5" /><span>Дуудлагад орох</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Subcomponent to handle kicking users
function BanControls({ currentRoom, currentIdentity }: { currentRoom: string, currentIdentity: string }) {
  const participants = useParticipants();
  
  // Exclude ourselves
  const others = participants.filter(p => p.identity !== currentIdentity);

  const handleKick = async (identity: string) => {
    try {
      const res = await fetch('/api/livekit/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: currentRoom, identity }),
      });
      const data = await res.json();
      if (data.success) {
         toast.success("Хэрэглэгчийг гаргалаа");
      } else {
         toast.error("Алдаа гарлаа: " + data.error);
      }
    } catch (e) {
      toast.error("Гаргах хүсэлт амжилтгүй боллоо");
    }
  };

  return (
    <div className="absolute top-2 left-2 right-2 z-50 flex flex-col gap-2">
       <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
        <span className="text-white text-[10px] font-semibold flex items-center gap-2 truncate">
            Өрөө: {currentRoom}
        </span>
      </div>
      
      {others.length > 0 && (
        <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/20 mt-2">
            <h3 className="text-xs text-white/70 mb-2 uppercase font-semibold">Оролцогчид</h3>
            <div className="flex flex-col gap-2">
                {others.map(p => (
                    <div key={p.identity} className="flex items-center justify-between gap-4 text-white text-sm">
                        <span>{p.identity}</span>
                        <button 
                            onClick={() => handleKick(p.identity)}
                            title="Гаргах (Ban)"
                            className="p-1.5 bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                        >
                            <Ban className="w-4 h-4 text-white" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}