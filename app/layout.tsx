import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ClientLayout from './ClientLayout';
import NextTopLoader from 'nextjs-toploader';
import CapacitorBackButton from '@components/providers/CapacitorBackButton';
import { SITE_CONFIG } from '@lib/constants';
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FF7900',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://soyolvideoshop.mn'),
  title: {
    default: `${SITE_CONFIG.name} - ${SITE_CONFIG.description}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: 'Олон улсын чанартай бүтээгдэхүүнийг бөөний үнээр. Хурдан хүргэлт, баталгаат чанар, найдвартай үйлчилгээ.',
  keywords: ['video shop', 'Mongolia', 'бөөний үнэ', 'онлайн худалдаа', 'хурдан хүргэлт', 'электрон бараа', 'гар утас', 'компьютер'],
  authors: [{ name: 'Soyol Video Shop' }],
  creator: 'Soyol Video Shop',
  publisher: 'Soyol Video Shop',
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'mn_MN',
    url: 'https://soyolvideoshop.mn',
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} - ${SITE_CONFIG.description}`,
    description: 'Олон улсын чанартай бүтээгдэхүүнийг бөөний үнээр',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.name} - Online Shopping`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_CONFIG.name} - ${SITE_CONFIG.description}`,
    description: 'Олон улсын чанартай бүтээгдэхүүнийг бөөний үнээр',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" className={inter.variable} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={SITE_CONFIG.name} />
      </head>
      <body className={`${inter.className} min-h-screen bg-white antialiased`}>
        <NextTopLoader color="#FF7900" showSpinner={false} height={3} />
        <CapacitorBackButton />
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
