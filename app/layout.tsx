import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { WatchlistProvider } from '@/contexts/WatchlistContext';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import Footer from '@/components/Footer';
import TelemetryOptimization from '@/components/TelemetryOptimization';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'عرب فليكس Arabflex - منصة مشاهدة أحدث الأفلام والمسلسلات',
  description:
    'عرب فليكس (Arabflex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة وقائمة مشاهدة سحابية متزامنة.',
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
    title: 'عرب فليكس Arabflex',
  },
  openGraph: {
    title: 'عرب فليكس Arabflex - منصة مشاهدة أحدث الأفلام والمسلسلات',
    description:
      'عرب فليكس (Arabflex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة وقائمة مشاهدة سحابية متزامنة.',
    type: 'website',
    images: [
      {
        url: '/yemenflex-banner.jpg',
        width: 1280,
        height: 720,
        alt: 'عرب فليكس Arabflex',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'عرب فليكس Arabflex',
    description:
      'عرب فليكس (Arabflex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة.',
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
                  if (!msg) return false;
                  var str = typeof msg === 'string' ? msg : (msg.message || String(msg));
                  return str.indexOf('ChunkLoadError') !== -1 || str.indexOf('Loading chunk') !== -1 || str.indexOf('Failed to fetch dynamically imported module') !== -1;
                }
                function recoverChunk() {
                  try {
                    var reloadKey = 'chunk_reload_' + location.pathname;
                    var lastReload = sessionStorage.getItem(reloadKey);
                    var now = Date.now();
                    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                      sessionStorage.setItem(reloadKey, String(now));
                      window.location.reload();
                    }
                  } catch (e) {}
                }
                window.addEventListener('error', function(e) {
                  var msg = (e && e.message) ? e.message : ((e && e.error && e.error.message) ? e.error.message : '');
                  if (isChunkError(msg) || (e && e.error && (e.error.name === 'ChunkLoadError' || isChunkError(e.error.name)))) {
                    if (e.preventDefault) e.preventDefault();
                    console.warn('Arabflex: Auto-recovering from ChunkLoadError...');
                    recoverChunk();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = (e && e.reason) ? (e.reason.message || String(e.reason)) : '';
                  if (isChunkError(reason) || (e && e.reason && e.reason.name === 'ChunkLoadError')) {
                    if (e.preventDefault) e.preventDefault();
                    console.warn('Arabflex: Recovering from unhandled chunk rejection...');
                    recoverChunk();
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
