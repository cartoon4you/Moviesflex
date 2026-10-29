import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { WatchlistProvider } from '@/contexts/WatchlistContext';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import Footer from '@/components/Footer';
import TelemetryOptimization from '@/components/TelemetryOptimization';
import Link from 'next/link';
import { Film, Heart, Shield, Sparkles } from 'lucide-react';
import YemenflexLogo from '@/components/YemenflexLogo';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'يمن فلکس YemenFlex - منصة مشاهدة أحدث الأفلام والمسلسلات',
  description:
    'يمن فلکس (YemenFlex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة وقائمة مشاهدة سحابية متزامنة.',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'يمن فلکس YemenFlex',
  },
  openGraph: {
    title: 'يمن فلکس YemenFlex - منصة مشاهدة أحدث الأفلام والمسلسلات',
    description:
      'يمن فلکس (YemenFlex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة وقائمة مشاهدة سحابية متزامنة.',
    type: 'website',
    images: [
      {
        url: '/yemenflex-banner.jpg',
        width: 1280,
        height: 720,
        alt: 'يمن فلکس Yemenflex',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'يمن فلکس YemenFlex',
    description:
      'يمن فلکس (YemenFlex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة.',
    images: ['/yemenflex-banner.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark bg-neutral-950 text-neutral-100">
      <head>
        {/* Early Chunk & Script Load Resilience */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function isChunkError(msg) {
                  return typeof msg === 'string' && (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1);
                }
                window.addEventListener('error', function(e) {
                  var msg = (e && e.message) ? e.message : ((e && e.error && e.error.message) ? e.error.message : '');
                  if (isChunkError(msg) || (e && e.error && e.error.name === 'ChunkLoadError')) {
                    if (e.preventDefault) e.preventDefault();
                    console.warn('YemenFlex: Handled early ChunkLoadError gracefully.');
                    var reloadKey = 'chunk_reload_' + location.pathname;
                    if (!sessionStorage.getItem(reloadKey)) {
                      sessionStorage.setItem(reloadKey, '1');
                      location.reload();
                    }
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = (e && e.reason) ? (e.reason.message || String(e.reason)) : '';
                  if (isChunkError(reason)) {
                    if (e.preventDefault) e.preventDefault();
                    console.warn('YemenFlex: Suppressed unhandled chunk rejection.');
                  }
                });
              })();
            `,
          }}
        />

        {/* Mobile & Web App optimization */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* Connection Warming for Media Delivery & CDN Domains */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://downet.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://downet.net" />
        <link rel="preconnect" href="https://img.downet.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.downet.net" />
        <link rel="preconnect" href="https://akwam.ss" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://play.google.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://play.google.com" />
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-neutral-950 selection:bg-red-600 selection:text-white pb-[env(safe-area-inset-bottom,0px)]" suppressHydrationWarning>
        <TelemetryOptimization />
        <AuthProvider>
          <WatchlistProvider>
            <Navbar />
            <MobileBottomNav />
            <main className="flex-1 w-full pt-[112px] md:pt-[64px] lg:pt-[72px] pb-12 md:pb-16">{children}</main>
            <Footer />
          </WatchlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
