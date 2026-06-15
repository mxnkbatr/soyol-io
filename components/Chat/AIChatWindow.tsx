'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Bot, User, Sparkles, ChevronLeft, Loader2, Image as ImageIcon, X, Gift, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '@/hooks/useTranslation';
import AddressConfirmationCard from './AddressConfirmationCard';
import ChatProductRecommendations from './ChatProductRecommendations';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import { useChat } from '@ai-sdk/react';
import { parseChatMessageContent, getProductsFromParts } from '@/lib/chatMessageParser';

interface AIChatWindowProps {
  onBack: () => void;
}

interface ExtendedMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'data' | 'tool';
  content?: string;
  parts?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  experimental_attachments?: Array<{ name?: string; contentType?: string; url: string } | string>;
}

const QUICK_PROMPTS = [
  { icon: Gift, label: 'Бэлэг санал', text: 'Эмэгтэйд өгөх сайхан бэлэг санал болго' },
  { icon: Search, label: 'Шинэ бараа', text: 'Хамгийн шинэ нэмэгдсэн бараануудыг харуул' },
];

function getMessageText(msg: ExtendedMessage): string {
  if (typeof msg.content === 'string' && msg.content.length > 0) return msg.content;
  if (msg.parts?.length) {
    return msg.parts
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text)
      .join('');
  }
  return msg.content || '';
}

function getMessageFiles(msg: ExtendedMessage): Array<{ url: string; contentType?: string }> {
  if (msg.parts?.length) {
    return msg.parts
      .filter((p) => p.type === 'file' && p.url)
      .map((p) => ({ url: p.url as string, contentType: p.mediaType as string }));
  }
  if (msg.experimental_attachments?.length) {
    return msg.experimental_attachments.map((att: any) =>
      typeof att === 'string' ? { url: att } : { url: att.url, contentType: att.contentType },
    );
  }
  return [];
}

export default function AIChatWindow({ onBack }: AIChatWindowProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const addItem = useCartStore((s) => s.addItem);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedActions = useRef<Set<string>>(new Set());

  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');

  const { messages: rawMessages, status, sendMessage } = useChat({
    api: '/api/chat',
    onError: (error: Error) => {
      const msg = error?.message || '';
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        toast.error('Систем ачаалалтай байна. Дараа дахин оролдоно уу.');
      } else if (msg.toLowerCase().includes('api key')) {
        toast.error('AI үйлчилгээ идэвхгүй байна.');
      } else {
        toast.error('Алдаа гарлаа. Дахин оролдоно уу.');
      }
    },
  } as any);

  const messages = rawMessages as unknown as ExtendedMessage[];
  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachment, isLoading]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== 'assistant') return;

    const textContent = getMessageText(lastMessage);
    const actionRegex = /\[ACTION:([A-Z_]+):(.*?):END_ACTION\]/g;
    let match;
    while ((match = actionRegex.exec(textContent)) !== null) {
      const fullMatch = match[0];
      if (processedActions.current.has(fullMatch)) continue;
      processedActions.current.add(fullMatch);

      const actionType = match[1];
      const actionContent = match[2];

      if (actionType === 'ADD_TO_CART_DATA') {
        try {
          const parsed = JSON.parse(actionContent);
          addItem({
            id: parsed.id,
            name: parsed.name,
            price: parsed.price,
            image: parsed.image || '/placeholder.png',
            category: 'general',
            stockStatus: 'in-stock',
          });
          toast.success('Сагсанд нэмэгдлээ! 🛒');
        } catch {
          // ignore parse errors
        }
      } else if (actionType === 'NAVIGATE') {
        router.push(actionContent);
      }
    }
  }, [messages, addItem, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment(reader.result as string);
      setAttachmentType(file.type.startsWith('video') ? 'video' : 'image');
    };
    reader.readAsDataURL(file);
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendText = async (text: string) => {
    if (!text.trim() || isLoading) return;
    await sendMessage({ text: text.trim() });
    setInput('');
    clearAttachment();
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeInput = input || '';
    if ((!safeInput.trim() && !attachment) || isLoading) return;

    const files: Array<{ type: 'file'; url: string; mediaType: string }> = [];
    if (attachment) {
      const mediaTypeMatch = attachment.match(/^data:([^;]+);/);
      const mediaType = mediaTypeMatch?.[1] || (attachmentType === 'video' ? 'video/mp4' : 'image/png');
      files.push({ type: 'file', url: attachment, mediaType });
    }

    await sendMessage({
      text: safeInput.trim() || 'Энэ зургийг шинжилж, тохирох бараа санал болго',
      ...(files.length > 0 ? { files } : {}),
    });
    setInput('');
    clearAttachment();
  };

  const renderAssistantContent = (msg: ExtendedMessage) => {
    const text = getMessageText(msg);
    const parts = parseChatMessageContent(text, msg.parts);
    const products = getProductsFromParts(parts);
    const textParts = parts.filter((p): p is { type: 'text'; content: string } => p.type === 'text' && !!p.content?.trim());
    const addressCards = parts.filter((p): p is { type: 'ADDRESS_CONFIRMATION'; data: Record<string, string> } => p.type === 'ADDRESS_CONFIRMATION');

    return (
      <div className="space-y-3">
        {textParts.map((part, idx) => (
          <div key={`t-${idx}`} className="prose prose-invert prose-sm max-w-none leading-relaxed break-words text-[14px]">
            <ReactMarkdown>{part.content}</ReactMarkdown>
          </div>
        ))}
        {products.length > 0 && <ChatProductRecommendations products={products} />}
        {addressCards.map((part, idx) => (
          <AddressConfirmationCard key={`ac-${idx}`} data={part.data as { id: string; label: string; fullText: string }} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-slate-800/50 backdrop-blur-md shrink-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.2} />
        </button>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5000] to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20 ring-2 ring-white/10">
          <Sparkles className="w-5 h-5 text-white" strokeWidth={1.2} />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg leading-tight">{t('chat', 'aiAssistant')}</h3>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 font-medium">Бараа санал болгоно</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5">
              <p className="text-slate-200 text-sm leading-relaxed">
                Сайн байна уу! 👋 Би Soyol Shop-ийн AI туслагч. Танд тохирох бараа олж, үнэ харьцуулж, сагсанд нэмэхэд тусална.
              </p>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">Хурдан сонголт</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map(({ icon: Icon, label, text }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => sendText(text)}
                  disabled={isLoading}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-800/80 border border-white/5 hover:border-orange-500/30 hover:bg-slate-800 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-200">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id || idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-[#FF5000] ring-2 ring-orange-500/30'
                  : 'bg-gradient-to-tr from-[#FF5000] to-amber-400 ring-2 ring-orange-500/20'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" strokeWidth={1.2} />
              ) : (
                <Bot className="w-4 h-4 text-white" strokeWidth={1.2} />
              )}
            </div>

            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-md ${
                msg.role === 'user'
                  ? 'bg-[#FF5000] text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-white/5'
              }`}
            >
              {getMessageFiles(msg).map((att, i) => (
                <div key={i} className="mb-2">
                  {att.url?.startsWith('data:video') ? (
                    <video src={att.url} controls className="max-w-full rounded-xl max-h-48" />
                  ) : (
                    <img src={att.url} alt="" className="max-w-full rounded-xl max-h-48 object-cover" />
                  )}
                </div>
              ))}
              {msg.role === 'assistant' ? (
                renderAssistantContent(msg)
              ) : (
                <p className="text-[14px] leading-relaxed">{getMessageText(msg)}</p>
              )}
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF5000] to-amber-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" />
                </div>
                <span className="text-xs text-slate-400">Бараа хайж байна...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="absolute bottom-0 w-full p-4 pb-8 bg-slate-900/90 backdrop-blur-md border-t border-white/10 z-20">
        {attachment && (
          <div className="absolute -top-14 left-4 bg-slate-800 p-2 rounded-xl border border-white/10 flex items-center gap-2 shadow-lg">
            {attachmentType === 'video' ? (
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-[10px] text-slate-300">Video</div>
            ) : (
              <img src={attachment} alt="" className="w-10 h-10 rounded-lg object-cover" />
            )}
            <button onClick={clearAttachment} className="p-1 hover:bg-slate-700 rounded-full">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}
        <form
          onSubmit={onFormSubmit}
          className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-3xl border border-white/5 focus-within:border-orange-500/40 transition-all shadow-lg"
        >
          <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Жишээ: 200,000₮-ийн бэлэг санал болго..."
            className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 px-2 py-2 text-sm outline-none min-w-0"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={((!input || !input.trim()) && !attachment) || isLoading}
            className="p-3 bg-[#FF5000] text-white rounded-2xl disabled:opacity-50 hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 transition-all shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
