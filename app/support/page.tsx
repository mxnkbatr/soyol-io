'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, ChevronDown, ChevronUp, PhoneCall, MessageCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQS = [
    {
        id: 1,
        question: 'ХҮРГЭЛТИЙН ҮЙЛЧИЛГЭЭ',
        answer: (
            <p>
                Бид барааны овор хэмжээнээс үл шалтгаалан ширхэг барааг ч Улаанбаатар хотын өнцөг булан бүрт 2-6 цагийн дотор гарт тань хүргэж өгч байна. Мөн орон нутгийн захиалгыг албан ёсны хуваарийн дагуу шуудангийн унаанд болон хот хоорондын тээвэрт хүргэж өгч үйлчилж байна.
            </p>
        )
    },
    {
        id: 2,
        question: 'ТӨЛБӨР ТӨЛӨХ БОЛОМЖУУД',
        answer: (
            <div className="space-y-2">
                <p>Та дараах хэлбэрүүдээр төлбөрөө төлөх боломжтой:</p>
                <ul className="list-disc pl-4 space-y-1">
                    <li>Бүх банкны аппликейшн болон QPay</li>
                    <li>SocialPay, MonPay</li>
                    <li>Storepay, PocketZero (Хүүгүй хуваан төлөх)</li>
                    <li>Дансаар шилжүүлэх</li>
                </ul>
            </div>
        )
    },
    {
        id: 3,
        question: 'БАРАА БУЦААЛТ БА СОЛИЛЦОО',
        answer: (
            <p>
                Хэрэглэгч барааг хүлээн авснаас хойш 24 цагийн дотор үйлдвэрийн гэмтэлтэй эсвэл буруу бараа хүргэгдсэн тохиолдолд буцаах эсвэл солиулах эрхтэй. Барааны сав баглаа боодол бүрэн, ашиглагдаагүй байх шаардлагатайг анхаарна уу.
            </p>
        )
    },
    {
        id: 4,
        question: 'ЗАХИАЛГА ӨГӨХ ЗААВАР',
        answer: (
            <p>
                Та хүссэн бараагаа сагсандаа нэмж, хүргэлтийн хаяг болон холбоо барих дугаараа оруулаад төлбөрөө төлснөөр захиалга баталгаажна. Захиалга баталгаажсан даруйд манай хүргэлтийн ажилтан тантай холбогдох болно.
            </p>
        )
    }
];

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [openId, setOpenId] = useState<number | null>(null);

    const filteredFaqs = FAQS.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
            {/* Header */}
            <div className="bg-white h-[56px] flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sticky top-0 z-50">
                <Link href="/profile" className="p-2 -ml-2 text-[#1A1A1A]">
                    <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                </Link>
                <h1 className="flex-1 text-center text-[16px] font-bold text-[#1A1A1A] pr-8">
                    Тусламж & Дэмжлэг
                </h1>
            </div>

            <div className="p-4 space-y-6">

                {/* Search */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-[#999999]" strokeWidth={2} />
                    </div>
                    <input
                        type="text"
                        placeholder="Асуулт хайх..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-white border border-transparent rounded-[14px] leading-5 text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-medium text-[15px]"
                    />
                </div>

                {/* FAQ Section */}
                <div className="space-y-2">
                    <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Түгээмэл асуултууд</h2>
                    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((faq, index) => {
                                const isOpen = openId === faq.id;
                                return (
                                    <div key={faq.id} className={`${index !== filteredFaqs.length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}>
                                        <button
                                            onClick={() => setOpenId(isOpen ? null : faq.id)}
                                            className="w-full flex items-center justify-between p-4 text-left active:bg-gray-50 transition-colors"
                                        >
                                            <span className="text-[15px] font-bold text-[#1A1A1A] pr-4 leading-tight">{faq.question}</span>
                                            {isOpen ? (
                                                <ChevronUp className="w-5 h-5 text-[#FF6B00] shrink-0" strokeWidth={2} />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-[#999999] shrink-0" strokeWidth={2} />
                                            )}
                                        </button>
                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden bg-[#FAFAFA]"
                                                >
                                                    <div className="p-4 pt-0 text-[14px] text-[#666666] leading-relaxed">
                                                        {faq.answer}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-6 text-center text-[#999999] text-[14px]">
                                Илэрц олдсонгүй
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Section */}
                <div>
                    <h2 className="text-[11px] font-bold text-[#999999] uppercase tracking-wider ml-4 mb-2">Холбоо барих</h2>
                    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col gap-[1px] bg-[#F5F5F5]">

                        <a href="tel:77181818" className="flex items-center justify-between p-4 bg-white active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                                    <PhoneCall className="w-5 h-5 text-[#FF6B00]" strokeWidth={2} />
                                </div>
                                <div>
                                    <div className="text-[13px] text-[#999999] font-medium mb-0.5">Утас</div>
                                    <div className="text-[16px] font-bold text-[#1A1A1A]">77-181818</div>
                                </div>
                            </div>
                            <span className="text-[13px] font-bold text-[#FF6B00] px-3 py-1.5 bg-orange-50 rounded-full">Залгах</span>
                        </a>

                        <a href="https://www.facebook.com/SoyolVideoShop/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white active:bg-gray-50 transition-colors w-full text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                    <MessageCircle className="w-5 h-5 text-blue-500" strokeWidth={2} />
                                </div>
                                <div>
                                    <div className="text-[16px] font-bold text-[#1A1A1A]">Чат дэмжлэг</div>
                                    <div className="text-[12px] text-[#999999] font-medium mt-0.5">Онлайн: 09:00 - 18:00</div>
                                </div>
                            </div>
                            <span className="text-[13px] font-bold text-[#FF6B00] px-3 py-1.5 bg-orange-50 rounded-full">Бичих</span>
                        </a>

                        <a href="mailto:info@soyolvideoshop.mn" className="flex items-center justify-between p-4 bg-white active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-gray-500" strokeWidth={2} />
                                </div>
                                <div>
                                    <div className="text-[13px] text-[#999999] font-medium mb-0.5">И-мэйл</div>
                                    <div className="text-[15px] font-bold text-[#1A1A1A]">info@soyolvideoshop.mn</div>
                                </div>
                            </div>
                        </a>

                    </div>
                </div>

            </div>
        </div>
    );
}