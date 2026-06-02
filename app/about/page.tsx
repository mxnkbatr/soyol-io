'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  Shield,
  Zap,
  HelpCircle,
  TrendingUp,
  Globe
} from 'lucide-react';

export default function AboutPage() {
  const features = [
    {
      icon: Globe,
      title: 'Олон улсын захиалга',
      description: 'Япон, Солонгос, Хятад улсын хамгийн том интернет худалдааны сайтуудаас хүссэн барааг тань хамгийн хямд үнээр нийлүүлнэ.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Shield,
      title: 'Чанартай үйлдвэр',
      description: 'Бид найдвартай үйлдвэрүүдийг сонгон судлаж, чанарын шаардлага хангасан бүтээгдэхүүнийг захиалагчдад хүргэдэг.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: TrendingUp,
      title: 'Трэнд бүтээгдэхүүн',
      description: 'Хамгийн сүүлийн үеийн трэнд болж буй шинэ, шинэлэг бараа бүтээгдэхүүнийг цаг тухай бүр санал болгож байна.',
      color: 'from-soyol to-yellow-400',
    },
    {
      icon: Zap,
      title: 'Технологийн шийдэл',
      description: 'Хиймэл оюун ухаан дээр суурилсан технологийн тусламжтайгаар захиалгын бүх процессийг хянах боломжтой.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Truck,
      title: 'Шуурхай хүргэлт',
      description: 'Улаанбаатар хотын А, Б бүсэд 7-14 хоногт хүргэж өгнө.',
      color: 'from-red-500 to-orange-500',
    },
    {
      icon: HelpCircle,
      title: 'Найрсаг үйлчилгээ',
      description: 'Олон жилийн дадлага туршлагатай баг хамт олон танд итгэлтэй байдал, найрсаг харилцааг амлаж байна.',
      color: 'from-indigo-500 to-blue-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-soyol via-orange-500 to-yellow-400 py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-bold mb-6">
              Since 2019
            </span>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
              БИДНИЙ ТУХАЙ
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-medium leading-relaxed mb-8">
              Soyol Video Shop нь Монголын хамгийн анхны видео дэлгүүр болон байгуулагдсан бөгөөд өнөөдрийг хүртэл цахим худалдааны чиглэлээр үйл ажиллагаа тогтвортой явуулж байна.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 bg-white text-soyol rounded-2xl font-black shadow-xl">
                ЭРХЭМ ЗОРИЛГО
              </div>
              <p className="w-full text-lg font-bold opacity-90 italic">
                "Хүлээлтээс давсан үйлчилгээг тогтвортой хүргэхийг бид зорьно"
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">Яагаад биднийг сонгох вэ?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Бид чанартай барааг хамгийн хямд үнээр, хамгийн хурдан шуурхай хүргэхийг зорилгоо болгон ажилладаг.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}