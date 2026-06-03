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
        question: 'ХОЛБОО БАРИХ МЭДЭЭЛЭЛ',
        answer: (
            <div className="space-y-3">
                <p>
                    Та захиалга хүргэлтийн нэгдсэн төв болох <strong className="text-[#1A1A1A]">77-181818</strong> дугаарт залгах эсвэл дуут зурвас үлдээж бидэнтэй холбогдох боломжтой. Мөн албан ёсны Facebook, Instagram хуудсаар дамжуулан холбогдох боломжтой. Бид ажлын цагаар танд яаралтай хариу өгч холбогдох болно.
                </p>
                <p>
                    <strong className="text-[#1A1A1A]">Манай хаяг:</strong> Баянзүрх дүүрэг 2 дугаар хороо Сансарын Ундрам плаза Юник оффис 5 давхарт 501 тоот 77181818
                </p>
            </div>
        )
    },
    {
        id: 3,
        question: 'БАРААГ БУЦААХ, СОЛИХ НӨХЦӨЛ',
        answer: (
            <ul className="list-disc pl-4 space-y-2">
                <li>Худалдан авагч нь барааг хүлээн авснаас (хүргэлт дууссан) хойш 72 цагийн дотор 77-181818 утсанд холбогдон мэдэгдсэнээр буцааж, сольж болно.</li>
                <li>Бараа буцаах, солиход гарах зардлыг тухайн нөхцөлийг үүсгэсэн тал хариуцна. Тухайлбал: бараа гэмтэлтэй, буруу бараа илгээсэн бол борлуулагч тал хариуцна. Харин худалдан авагчаас шалтгаалан буцаах, солих тохиолдолд худалдан авагч хариуцна.</li>
                <li>Буцаах барааг хүргэлтийн жолооч авахдаа бүрэн бүтэн байдал болон эвдрэл гэмтэл хайрцаг сав, баглаа боодлыг сайтар шалган авч цааш нь хүлээлгэж өгнө.</li>
                <li>Худалдан авагчийн солихыг хүссэн бараа борлуулагчид байхгүй тохиолдолд талууд харилцан тохиролцож барааг буцааж болно.</li>
            </ul>
        )
    },
    {
        id: 4,
        question: 'ТӨЛБӨР БУЦААН ОЛГОХ',
        answer: (
            <ul className="list-disc pl-4 space-y-2">
                <li>Худалдан авагч худалдан авалтаа цуцалсан, барааг буцаасан тохиолдолд тухайн барааны үнийг төлбөр буцаах үйл ажиллагаа 24 цагийн дотор худалдан авагчийн дансанд шилжүүлнэ.</li>
                <li>Буцаасан барааны буцаалтын зардлыг худалдан авагч хариуцах бөгөөд худалдан авагч буцаалтын төлбөрөө төлөөгүй тохиолдолд бараа хүргэлт ба буцаалтын зардлыг буцаах төлбөрөөс хасч шилжүүлнэ.</li>
                <li>Худалдан авагч өөрийн хүсэлтээр захиалгаа цуцалсан тохиолдолд худалдан авалттай холбогдон гарсан төлбөрийн гүйлгээний шимтгэлийг болон бусад зардлыг хариуцан төлнө.</li>
            </ul>
        )
    },
    {
        id: 5,
        question: 'БАРААГ БУЦААХ БОЛОН СОЛИХООС ТАТГАЛЗАХ',
        answer: (
            <ul className="list-disc pl-4 space-y-2">
                <li>Худалдан авагчаас шалтгаалан бараа гэмтсэн, бохирдсон, чанараа алдсан тохиолдолд</li>
                <li>Худалдан авагч барааг ашигласнаас үүдэн барааны үнэ цэнэ буурсан бол</li>
                <li>Бараа хүлээн авснаас хойш 72 цаг өнгөрсөн тохиолдолд</li>
                <li>Хувилан олшруулах боломжтой барааны баглаа боодол гэмтсэн, нээгдсэн бол</li>
                <li>Зөвхөн тухайн худалдан авагчийн захиалгад үндэслэн үйлдвэрлэгдсэн бараа</li>
                <li>Тухайн барааг худалдаалахдаа буцаах болон солих боломжгүй хэмээн заасан бараа</li>
                <li>Нэг барааны талаар хоёроос дээш буцаах тухай тохирсон боловч худалдан авагчийн буруутай үйл ажиллагаанаас болж хүлээгдэх нөхцөл</li>
            </ul>
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