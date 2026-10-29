'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogIn, LogOut, User, Shield, Sparkles, Heart, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import YemenflexLogo from '@/components/YemenflexLogo';
import PreloadSpeedBadge from '@/components/PreloadSpeedBadge';

export default function Footer() {
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Footer sign-in error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <footer
      id="main-footer"
      className="w-full bg-neutral-950 border-t border-neutral-800/80 pt-12 pb-16 px-4 sm:px-8 text-neutral-400 text-xs mt-auto"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Bottom Login Action Banner */}
        <div
          id="bottom-login-section"
          className="bg-gradient-to-r from-neutral-900/90 via-red-950/20 to-neutral-900/90 rounded-3xl border border-neutral-800/90 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
        >
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 text-center md:text-right relative z-10">
            {currentUser ? (
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-12 h-12 rounded-full object-cover border-2 border-red-500 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-base font-bold shadow-md">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>مرحباً، {currentUser.displayName || 'المستخدم'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                      نشط سحابياً
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">{currentUser.email}</p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className="w-5 h-5 text-red-500 animate-pulse" />
                  <span>سجل دخولك الآن لحفظ قائمتك في السحابة</span>
                </h3>
                <p className="text-xs text-neutral-400 max-w-xl mt-1">
                  احفظ مسلسلاتك وأفلامك المفضلة واستكمل المشاهدة من أي جهاز في أي وقت عبر تزامن Google Firestore الآمن.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Login / Account Action Button */}
          <div className="relative z-10 flex-shrink-0">
            {currentUser ? (
              <button
                type="button"
                id="footer-logout-btn"
                onClick={logout}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-neutral-950/80 hover:bg-red-950/60 text-red-400 hover:text-red-300 border border-neutral-800 hover:border-red-500/40 font-bold text-xs transition active:scale-95 cursor-pointer shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            ) : (
              <button
                type="button"
                id="footer-login-btn"
                onClick={handleSignIn}
                disabled={authLoading}
                className="flex items-center gap-3 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 text-white font-bold text-xs shadow-xl shadow-red-950/50 transition cursor-pointer disabled:opacity-60 border border-red-500/50"
              >
                <LogIn className="w-4.5 h-4.5" />
                <span>{authLoading ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول عبر Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Links and Copyright Grid */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-neutral-900">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
            <YemenflexLogo size="sm" />
            <p className="text-[11px] text-neutral-400 sm:border-r sm:border-neutral-800 sm:pr-4">
              منصة يمن فلکس (YemenFlex) - بث فائق الجودة، سيرفرات سريعة وبدون إعلانات.
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-5 text-neutral-300 font-medium text-xs">
            <Link href="/" className="hover:text-red-400 transition">الرئيسية</Link>
            <Link href="/catalog?type=movie" className="hover:text-red-400 transition">الأفلام</Link>
            <Link href="/catalog?type=series" className="hover:text-red-400 transition">المسلسلات</Link>
            <Link href="/watchlist" className="hover:text-red-400 transition">قائمة المشاهدة</Link>
            <Link href="/linkgrabber" className="hover:text-red-400 transition">محلل الروابط</Link>
          </div>

          <div className="flex items-center gap-3 text-neutral-500 text-[11px]">
            <PreloadSpeedBadge />
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>تزامن سحابي مشفر وآمن</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
