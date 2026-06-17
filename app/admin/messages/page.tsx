'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useUser } from '@/context/AuthContext';
import {
    Loader2, MessageSquare, Video, Phone, ArrowLeft,
    Search, User, Clock, AlertCircle, MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import SupportChatWindow from '@/components/Chat/SupportChatWindow';
import VideoCall from '@/components/VideoCall';
import { buildAdminCallIdentity, buildSupportRoomName } from '@/lib/livekitRoom';
import toast from 'react-hot-toast';

interface Conversation {
    _id: string;
    userId: string;
    userName?: string;
    lastMessage?: string;
    lastMessageAt: string;
    adminUnreadCount?: number;
    userUnreadCount?: number;
    createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
});

export default function AdminMessagesPage() {
    const { user, isLoaded } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    // Call state variables
    const [callRoom, setCallRoom] = useState('');
    const [isCallActive, setIsCallActive] = useState(false);
    const [isVoiceCall, setIsVoiceCall] = useState(false);

    // Mobile View state: 'list' | 'chat' | 'call'
    const [mobileView, setMobileView] = useState<'list' | 'chat' | 'call'>('list');

    // SWR fetcher to poll conversations list every 5 seconds
    const { data: conversations, error, mutate } = useSWR<Conversation[]>(
        '/api/messages/conversations',
        fetcher,
        { refreshInterval: 5000 }
    );

    // Filtered and sorted conversations
    const sortedConversations = useMemo(() => {
        if (!conversations) return [];

        // Sort by lastMessageAt descending
        const sorted = [...conversations].sort((a, b) => {
            const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
            const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
            return timeB - timeA;
        });

        if (!searchTerm.trim()) return sorted;

        return sorted.filter((c) => {
            const name = c.userName?.toLowerCase() || 'guest';
            const id = c._id.toLowerCase();
            return name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());
        });
    }, [conversations, searchTerm]);

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConversation(conv);
        setMobileView('chat');
    };

    const handleBackToList = () => {
        setMobileView('list');
    };

    const postCallInvite = async (conversationId: string, room: string, isVoice: boolean) => {
        const bodyText = isVoice
            ? `📞 Дуут дуудлага эхэллээ: ${room}`
            : `📹 Видео дуудлага эхэллээ: ${room}`;

        const senderName = user?.name || 'Support Admin';

        try {
            await fetch(`/api/messages/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    body: bodyText,
                    senderName,
                    type: 'call_invite', // 1. Added message type property
                    roomName: room       // 2. Added roomName property
                })
            });
        } catch (e) {
            console.error('Failed to post call invite message:', e);
        }
    };

    const handleStartCall = async (isVoice: boolean = false) => {
        if (!selectedConversation) return;

        const room = selectedConversation.userId
            ? buildSupportRoomName(selectedConversation.userId)
            : `support-guest-${selectedConversation._id}`;
        try {
            // Send call invite in the chat feed
            await postCallInvite(selectedConversation._id, room, isVoice);

            setCallRoom(room);
            setIsVoiceCall(isVoice);
            setIsCallActive(true);
            setMobileView('call');
            toast.success(isVoice ? 'Дуут дуудлага эхэллээ' : 'Видео дуудлага эхэллээ');
        } catch (err) {
            console.error(err);
            toast.error('Дуудлага үүсгэхэд алдаа гарлаа');
        }
    };

    const handleJoinCall = (room: string) => {
        setCallRoom(room);
        setIsVoiceCall(false); // Default to video if joined from message
        setIsCallActive(true);
        setMobileView('call');
    };

    const handleCallDisconnected = () => {
        setIsCallActive(false);
        setCallRoom('');
        setMobileView('chat');
    };

    // Helper format timestamp
    const formatTimestamp = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) {
            return '';
        }
    };

    if (!isLoaded) {
        return (
            <div className="h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 h-screen bg-slate-950 relative text-slate-100">
            {/* Header (Desktop & Mobile when not in call) */}
            {!isCallActive && (
                <header className="border-b border-white/5 bg-slate-900/60 backdrop-blur-xl shrink-0 z-20">
                    <div className="pl-16 pr-4 sm:pl-20 sm:pr-8 lg:px-8 py-5 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-orange-500" />
                                Тусламжийн чатууд
                            </h1>
                            <p className="text-xs text-slate-400 mt-1">Харилцагчдын шууд тусламж, дуудлагыг удирдах</p>
                        </div>
                    </div>
                </header>
            )}

            <main className="flex-1 flex overflow-hidden relative">
                {error ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-red-400">
                        <AlertCircle className="w-10 h-10 mb-2" />
                        <h3 className="font-bold">Алдаа гарлаа</h3>
                        <p className="text-xs text-slate-500 max-w-xs mt-1">Чатны өгөгдлийг серверээс татаж чадсангүй.</p>
                    </div>
                ) : !conversations ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                    </div>
                ) : (
                    <>
                        {/* Conversation Sidebar (hidden on mobile if in chat or call) */}
                        <div className={`
                            ${mobileView === 'list' ? 'flex' : 'hidden lg:flex'} 
                            w-full lg:w-80 h-full flex-col border-r border-white/5 bg-slate-900/40 shrink-0
                        `}>
                            {/* Search bar */}
                            <div className="p-4 border-b border-white/5">
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                                    <input
                                        type="text"
                                        placeholder="Хэрэглэгч хайх..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                    />
                                </div>
                            </div>

                            {/* Conversation List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
                                {sortedConversations.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 text-xs">
                                        Харилцан яриа олдсонгүй
                                    </div>
                                ) : (
                                    sortedConversations.map((conv) => {
                                        const isSelected = selectedConversation?._id === conv._id;
                                        const hasUnread = conv.adminUnreadCount && conv.adminUnreadCount > 0;
                                        const displayName = conv.userName || `Зочин #${conv._id.slice(-4)}`;

                                        return (
                                            <button
                                                key={conv._id}
                                                onClick={() => handleSelectConversation(conv)}
                                                className={`
                                                    w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between gap-3 group relative
                                                    ${isSelected
                                                        ? 'bg-gradient-to-r from-orange-500/10 to-amber-600/10 border border-orange-500/20 text-white'
                                                        : 'hover:bg-white/5 border border-transparent text-slate-300 hover:text-white'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform shrink-0 border border-white/5">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-semibold text-xs truncate">
                                                            {displayName}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-500 truncate mt-0.5 max-w-[160px]">
                                                            {conv.lastMessage || 'Зурвас байхгүй'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end shrink-0 gap-1.5">
                                                    <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatTimestamp(conv.lastMessageAt || conv.createdAt)}
                                                    </span>
                                                    {hasUnread && (
                                                        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-md animate-pulse">
                                                            {conv.adminUnreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Workspace Panel (Chat or Call container) */}
                        <div className={`
                            ${mobileView !== 'list' ? 'flex' : 'hidden lg:flex'} 
                            flex-1 h-full flex-col relative
                        `}>
                            {isCallActive ? (
                                <div className="flex-1 h-full p-4 bg-slate-950">
                                    <VideoCall
                                        prefilledRoom={callRoom}
                                        callerIdentity={user?.id ? buildAdminCallIdentity(user.id) : undefined}
                                        displayName={user?.name || 'Admin'}
                                        onDisconnected={handleCallDisconnected}
                                        initialVideoDisabled={isVoiceCall}
                                        onBack={handleCallDisconnected}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 h-full flex flex-col p-4">
                                    {selectedConversation ? (
                                        <SupportChatWindow
                                            conversationId={selectedConversation._id}
                                            guestId={undefined}
                                            onStartCall={() => handleStartCall(false)}
                                            onStartVoiceCall={() => handleStartCall(true)}
                                            onJoinCall={handleJoinCall}
                                            onBack={handleBackToList}
                                        />
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center bg-[#0B1120] rounded-2xl border border-white/5 shadow-xl p-8">
                                            <div className="w-20 h-20 rounded-full bg-slate-800/40 flex items-center justify-center mb-4 border border-white/5">
                                                <MessageCircle className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Чат сонгоно уу</h3>
                                            <p className="text-xs max-w-[260px] text-slate-400 leading-relaxed mx-auto">
                                                Зүүн талын жагсаалтаас хэрэглэгчийн чатыг сонгож харилцааг эхлүүлнэ үү.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}