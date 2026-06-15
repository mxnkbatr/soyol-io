'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Video, Phone, MessageCircle, Loader2 } from 'lucide-react';
import SupportChatWindow from '@/components/Chat/SupportChatWindow';
import AIChatWindow from '@/components/Chat/AIChatWindow';
import AdminSelector from '@/components/Chat/AdminSelector';
import VideoCall from '@/components/VideoCall';
import { useUser } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

interface AdminUser {
    _id: string;
    name?: string;
    email?: string;
    image?: string;
    userId: string;
    isOnline?: boolean;
}

export default function ChatWidget({ isOpen, onClose }: ChatWidgetProps) {
    const { user } = useUser();
    const { t } = useTranslation();

    // Generate a stable guest ID for unauthenticated users so chat messages have a sender
    const [guestId] = useState(() => {
        if (typeof window === 'undefined') return 'guest';
        let id = localStorage.getItem('soyol-guest-id');
        if (!id) {
            id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            localStorage.setItem('soyol-guest-id', id);
        }
        return id;
    });

    // Provide a minimal user-like object for guests
    const effectiveUser = user || { id: guestId, name: 'Зочин' };

    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'menu' | 'chat_selection' | 'video_selection' | 'chat' | 'video_call' | 'ai_chat'>('menu');
    const [connectingMode, setConnectingMode] = useState<'chat' | 'video_call' | null>(null);
    const [isVoiceCall, setIsVoiceCall] = useState(false);
    const [callRoom, setCallRoom] = useState<string | null>(null);

    const getOrCreateConversation = async (): Promise<string> => {
        const headers: any = { 'Content-Type': 'application/json' };
        if (guestId) {
            headers['x-guest-id'] = guestId;
        }

        // Fetch user's existing conversations
        const listRes = await fetch('/api/messages/conversations', { headers });
        if (listRes.ok) {
            const list = await listRes.json();
            if (Array.isArray(list) && list.length > 0) {
                return list[0]._id;
            }
        }

        // Create new support conversation if none exists
        const createRes = await fetch('/api/messages/conversations', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: 'Шууд тусламжийн чат эхэллээ.',
                senderName: effectiveUser.name
            })
        });

        if (createRes.ok) {
            const data = await createRes.json();
            return data.conversation._id;
        }

        throw new Error('Failed to establish support conversation');
    };

    const connectToAdmin = async (mode: 'chat' | 'video_call') => {
        setConnectingMode(mode);
        try {
            // First get or create conversation ID
            const convId = await getOrCreateConversation();
            setActiveConversationId(convId);

            // Fetch admins online status
            const res = await fetch('/api/users?role=admin');
            const data = await res.json();
            const anyOnline = Array.isArray(data) && data.some(a => a.isOnline);

            const supportAdmin: AdminUser = {
                _id: 'support_admin',
                userId: 'support_admin',
                name: 'Тусламжийн баг',
                isOnline: anyOnline
            };

            setSelectedAdmin(supportAdmin);

            if (mode === 'video_call') {
                // FIXED 1: Room name prefix set to support-
                const roomName = `support-${effectiveUser.id}`;
                setCallRoom(roomName);
                
                // Append call invitation message to conversation
                const headers: any = { 'Content-Type': 'application/json' };
                if (guestId) {
                    headers['x-guest-id'] = guestId;
                }
                
                await fetch(`/api/messages/conversations/${convId}/messages`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        type: 'call_invite',
                        roomName,
                        body: isVoiceCall
                            ? `📞 Дуут дуудлага эхэллээ: ${roomName}`
                            : `📹 Видео дуудлага эхэллээ: ${roomName}`,
                        senderName: effectiveUser.name,
                    }),
                });
            }

            setViewMode(mode);
        } catch (e) {
            console.error("Failed to connect to support:", e);
            toast.error('Холболт амжилтгүй. Дахин оролдоно уу.');
            setViewMode('menu');
        } finally {
            setConnectingMode(null);
        }
    };

    const handleSelectAdmin = (admin: AdminUser) => {
        setSelectedAdmin(admin);
        if (viewMode === 'video_selection') {
            setViewMode('video_call');
        } else {
            setViewMode('chat');
        }
    };

    const handleBack = () => {
        if (viewMode === 'chat' || viewMode === 'video_call' || viewMode === 'ai_chat') {
            setViewMode('menu');
            setSelectedAdmin(null);
            setActiveConversationId(null);
        } else {
            setViewMode('menu');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="fixed z-[100] bottom-24 right-4 md:right-28 w-[calc(100vw-32px)] md:w-96 h-[500px] max-h-[70vh] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5"
                >
                    {/* Header */}
                    <div className="bg-slate-800/80 backdrop-blur-md p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            {viewMode !== 'menu' && (
                                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <ArrowLeft className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
                                </button>
                            )}
                            <h3 className="font-bold text-white text-lg">
                                {viewMode === 'menu' ? t('chat', 'greeting') :
                                    viewMode === 'chat' && selectedAdmin ? (selectedAdmin.name || 'Chat') :
                                    viewMode === 'ai_chat' ? t('chat', 'aiAssistant') :
                                    viewMode === 'video_call' ? (isVoiceCall ? t('chat', 'voiceCall') : t('chat', 'videoCall')) :
                                    viewMode === 'video_selection' ? t('chat', 'selectVideoOperator') : t('chat', 'selectOperator')}
                            </h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-slate-400 hover:text-white" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden relative bg-transparent">
                        {viewMode === 'menu' ? (
                            <div className="flex flex-col gap-4 p-6 h-full justify-center">
                                {/* AI Assistant Option */}
                                <button
                                    onClick={() => setViewMode('ai_chat')}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/5 transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <MessageCircle className="w-24 h-24" />
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
                                    </div>
                                    <div className="relative z-10">
                                        <h4 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{t('chat', 'aiAssistant')}</h4>
                                        <p className="text-sm text-slate-400">{t('chat', 'askAi')}</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => connectToAdmin('chat')}
                                    disabled={connectingMode !== null}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/5 transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-[#FF5000] transition-colors relative z-10">
                                        {connectingMode === 'chat' ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <MessageCircle className="w-6 h-6 text-blue-500 group-hover:text-white" strokeWidth={1.5} />
                                        )}
                                    </div>
                                    <div className="relative z-10">
                                        <h4 className="font-bold text-white text-lg">{t('chat', 'sendMessage')}</h4>
                                        <p className="text-sm text-slate-400">{t('chat', 'chatWithOperator')}</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => connectToAdmin('video_call')}
                                    disabled={connectingMode !== null}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/5 transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:bg-[#FF5000] transition-colors relative z-10">
                                        {connectingMode === 'video_call' ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <Video className="w-6 h-6 text-orange-500 group-hover:text-white" strokeWidth={1.5} />
                                        )}
                                    </div>
                                    <div className="relative z-10">
                                        <h4 className="font-bold text-white text-lg">{t('chat', 'videoCall')}</h4>
                                        <p className="text-sm text-slate-400">{t('chat', 'joinByCode')}</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsVoiceCall(true);
                                        connectToAdmin('video_call');
                                    }}
                                    disabled={connectingMode !== null}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/5 transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors relative z-10">
                                        {connectingMode === 'video_call' && isVoiceCall ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" strokeWidth={1.5} />
                                        ) : (
                                            <Phone className="w-6 h-6 text-emerald-500 group-hover:text-white" strokeWidth={1.5} />
                                        )}
                                    </div>
                                    <div className="relative z-10">
                                        <h4 className="font-bold text-white text-lg">{t('chat', 'voiceCall')}</h4>
                                        <p className="text-sm text-slate-400">{t('chat', 'joinByCode')}</p>
                                    </div>
                                </button>
                            </div>
                        ) : viewMode === 'chat' && activeConversationId ? (
                            <SupportChatWindow
                                conversationId={activeConversationId}
                                guestId={guestId}
                                onStartCall={async () => {
                                    setIsVoiceCall(false);
                                    // FIXED 2: Room name prefix set to support-
                                    const roomName = `support-${effectiveUser.id}`;
                                    setCallRoom(roomName);
                                    
                                    const headers: any = { 'Content-Type': 'application/json' };
                                    if (guestId) headers['x-guest-id'] = guestId;

                                    await fetch(`/api/messages/conversations/${activeConversationId}/messages`, {
                                        method: 'POST',
                                        headers,
                                        body: JSON.stringify({
                                            type: 'call_invite',
                                            roomName,
                                            body: `📹 Видео дуудлага эхэллээ: ${roomName}`,
                                            senderName: effectiveUser.name,
                                        }),
                                    });
                                    setViewMode('video_call');
                                }}
                                onStartVoiceCall={async () => {
                                    setIsVoiceCall(true);
                                    // FIXED 3: Room name prefix set to support-
                                    const roomName = `support-${effectiveUser.id}`;
                                    setCallRoom(roomName);

                                    const headers: any = { 'Content-Type': 'application/json' };
                                    if (guestId) headers['x-guest-id'] = guestId;

                                    await fetch(`/api/messages/conversations/${activeConversationId}/messages`, {
                                        method: 'POST',
                                        headers,
                                        body: JSON.stringify({
                                            type: 'call_invite',
                                            roomName,
                                            body: `📞 Дуут дуудлага эхэллээ: ${roomName}`,
                                            senderName: effectiveUser.name,
                                        }),
                                    });
                                    setViewMode('video_call');
                                }}
                                onJoinCall={(roomName) => {
                                    setCallRoom(roomName);
                                    setViewMode('video_call');
                                }}
                                onBack={handleBack}
                            />
                        ) : viewMode === 'ai_chat' ? (
                            <AIChatWindow onBack={handleBack} />
                        ) : viewMode === 'video_call' && selectedAdmin ? (
                            <div className="h-full overflow-y-auto">
                                <VideoCall
                                    // FIXED 4: Fallback set to support- prefixed room name
                                    prefilledRoom={callRoom || `support-${effectiveUser.id}`}
                                    onBack={handleBack}
                                    initialVideoDisabled={isVoiceCall}
                                />
                            </div>
                        ) : (
                            // Admin Selection View (Shared for Chat and Video for now)
                            <div className="h-full overflow-y-auto">
                                <div className="p-4">
                                    <p className="text-slate-400 text-sm mb-4">
                                        {viewMode === 'video_selection'
                                            ? t('chat', 'selectVideoOperator')
                                            : t('chat', 'selectOperator')}
                                    </p>
                                    <AdminSelector onSelect={handleSelectAdmin} compact={true} />
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}