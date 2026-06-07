'use client';

import { motion } from 'framer-motion';
import {
  Phone, MapPin, Facebook, Instagram, MessageCircle,
  ShieldCheck, Truck, Headphones, CreditCard,
  Smartphone, Mail, ArrowRight, Globe, ChevronDown,
  QrCode, Apple, Play
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function Footer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { language, setLanguage, currency } = useLanguage();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');

  // Hide footer in native Capacitor app
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  if (!mounted || isNative) return null;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription logic
    setEmail('');
  };

  const trustBadges = [
    { icon: ShieldCheck, title: t('footer', 'securePayment'), desc: t('footer', 'securePaymentDesc') },
    { icon: Truck, title: t('footer', 'fastDelivery'), desc: t('footer', 'fastDeliveryDesc') },
    { icon: Headphones, title: t('footer', 'support247'), desc: t('footer', 'support247Desc') },
    { icon: CreditCard, title: t('footer', 'moneyBack'), desc: t('footer', 'moneyBackDesc') },
  ];

  return (
    <footer className="bg-gray-950 text-gray-300 font-sans">
      {/* Trust Strip - Temu/Taobao Style */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustBadges.map((badge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 group cursor-pointer"
              >
                <div className="p-3 bg-gray-800 rounded-full group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors duration-300">
                  <badge.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm group-hover:text-orange-500 transition-colors">{badge.title}</h4>
                  <p className="text-xs text-gray-500">{badge.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* Column 1: Brand & App (Large) */}
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="inline-block shrink-0">
              <div className="relative w-96 h-40">
                <Image
                  src="https://res.cloudinary.com/dc127wztz/image/upload/v1775638954/soyol-footer-logo_wuxvpt.png"
                  alt="Soyol Video Shop"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </Link>

            {/* App Download Section - High Traffic Site Feature */}
            <div className="p-4 bg-gray-900 rounded-2xl border border-gray-800 max-w-sm">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-orange-500" />
                {t('footer', 'downloadApp')}
              </h4>
              <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-lg">
                  <QrCode className="w-16 h-16 text-gray-900" />
                </div>
                <div className="space-y-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors w-full border border-gray-700">
                    <Apple className="w-4 h-4 text-white" fill="currentColor" />
                    <div className="text-left">
                      <div className="text-[10px] text-gray-400 leading-none">{t('footer', 'downloadOn')}</div>
                      <div className="text-xs font-bold text-white">{t('footer', 'appStore')}</div>
                    </div>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors w-full border border-gray-700">
                    <Play className="w-4 h-4 text-white fill-current" />
                    <div className="text-left">
                      <div className="text-[10px] text-gray-400 leading-none">{t('footer', 'getItOn')}</div>
                      <div className="text-xs font-bold text-white">{t('footer', 'googlePlay')}</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: About */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('footer', 'about')}</h3>
            <ul className="space-y-3">
              {[
                { label: t('footer', 'aboutUs'), href: '/about' },
                { label: t('footer', 'careers'), href: '/careers' },
                { label: t('footer', 'privacyPolicy'), href: '/privacy-policy' },
                { label: t('footer', 'termsOfService'), href: '/terms-of-service' }
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Help */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('footer', 'help')}</h3>
            <ul className="space-y-3">
              {[
                { label: t('footer', 'helpCenter'), href: '#' },
                { label: t('footer', 'trackOrder'), href: '#' },
                { label: t('footer', 'returns'), href: '#' },
                { label: t('footer', 'shippingInfo'), href: '#' },
                { label: t('footer', 'contactUs'), href: '#' }
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter & Social */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('footer', 'stayConnected')}</h3>
              <p className="text-sm text-gray-400">
                {t('footer', 'newsletterDesc')}
              </p>
              <form onSubmit={handleSubscribe} className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer', 'emailPlaceholder')}
                  className="w-full pl-10 pr-12 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 p-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('footer', 'followUs')}</h3>
              <div className="flex gap-3">
                {[
                  { icon: Facebook, href: 'https://www.facebook.com/SoyolVideoShop', color: 'hover:bg-[#1877F2]' },
                  { icon: Instagram, href: 'https://www.instagram.com/soyol_video_shop_85552229?fbclid=IwY2xjawQp1StleHRuA2FlbQIxMABicmlkETFpTVQ3UFNjSnRHS1AwM2hRc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHrapwSQbsGwv4dnai3_DWxT19gEY_qrPvaLw5XLyzLLWsGed40Iv4OBa8dPR_aem_3zR16bzS5qD0MkQDnyBecw', color: 'hover:bg-[#E4405F]' },
                  { icon: MessageCircle, href: 'https://whatsapp.com', color: 'hover:bg-[#25D366]' },
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 flex items-center justify-center bg-gray-900 rounded-full text-gray-400 transition-all duration-300 ${social.color} hover:text-white`}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('footer', 'facebookGroups')}</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://www.facebook.com/groups/1075978082545812"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-orange-500 flex items-center gap-2 transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                    {t('footer', 'group1')}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/groups/soyolvideoshop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-orange-500 flex items-center gap-2 transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                    {t('footer', 'group2')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-900 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">

            {/* Copyright */}
            <p className="text-xs text-gray-600 text-center md:text-left">
              {t('footer', 'copyright')}
            </p>

            {/* Language & Currency Selectors */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <Globe className="w-4 h-4" />
                  <span>{language === 'MN' ? 'Монгол' : 'English'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {/* Dropdown would go here */}
              </div>

              <div className="h-4 w-px bg-gray-800" />

              <div className="relative group">
                <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <span>{currency}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Payment Icons (Small) */}
            <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {['visa', 'mastercard', 'amex', 'paypal'].map((card) => (
                <div key={card} className="h-6 w-10 bg-gray-800 rounded flex items-center justify-center border border-gray-700">
                  <span className="text-[10px] uppercase font-bold">{card}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
