'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Film,
  Search,
  Bookmark,
  ChevronDown,
  Globe,
  Tv,
  Sparkles,
  Flame,
  Clapperboard,
  Video,
  LayoutGrid,
  LogIn,
  LogOut,
  User,
  X,
  Layers,
  Home,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { CATEGORIES } from '@/lib/catalog-data';
import { useIsMounted } from '@/hooks/use-mounted';
import YemenflexLogo from '@/components/YemenflexLogo';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const { watchlist } = useWatchlist();
  const mounted = useIsMounted();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target as Node)
      ) {
        setIsCategoriesOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus mobile search input when expanded
  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
      setIsMobileSearchOpen(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Film':
        return <Film className="w-4 h-4 text-red-500" />;
      case 'Globe':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'Tv':
        return <Tv className="w-4 h-4 text-emerald-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'Flame':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'Clapperboard':
        return <Clapperboard className="w-4 h-4 text-purple-400" />;
      case 'Video':
        return <Video className="w-4 h-4 text-cyan-400" />;
      default:
        return <LayoutGrid className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <header
      id="main-navbar"
      className="fixed top-0 inset-x-0 z-50 w-full bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 shadow-lg shadow-black/50 transition-all"
      dir="rtl"
    >
      {/* Compact Main Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 lg:h-18 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Desktop Nav Links */}
        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
          <Link
            href="/"
            id="brand-logo"
            className="group flex items-center transition-transform active:scale-95"
            aria-label="الصفحة الرئيسية - يمن فلکس Yemenflex"
          >
            <YemenflexLogo size="md" priority />
          </Link>

          {/* Desktop Navigation Links (Large Screens) */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/"
              id="nav-link-home"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname === '/'
                  ? 'text-white bg-neutral-900 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              الرئيسية
            </Link>

            <Link
              href="/catalog?type=movie"
              id="nav-link-movies"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname.includes('type=movie')
                  ? 'text-white bg-neutral-900 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              الأفلام
            </Link>

            <Link
              href="/catalog?type=series"
              id="nav-link-series"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname.includes('type=series')
                  ? 'text-white bg-neutral-900 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              المسلسلات
            </Link>

            {/* DEDICATED CATEGORIES DROPDOWN */}
            <div className="relative" ref={categoriesRef}>
              <button
                type="button"
                id="categories-dropdown-btn"
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${
                  isCategoriesOpen || pathname.startsWith('/catalog')
                    ? 'text-red-500 bg-neutral-900/90 font-semibold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-red-500" />
                <span>التصنيفات</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isCategoriesOpen ? 'rotate-180 text-red-500' : 'text-neutral-400'
                  }`}
                />
              </button>

              {/* Subcategories Mega Dropdown Menu */}
              {isCategoriesOpen && (
                <div
                  id="categories-dropdown-menu"
                  className="absolute right-0 mt-2 w-80 sm:w-[440px] bg-neutral-900/98 backdrop-blur-2xl border border-neutral-800 rounded-2xl p-3.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between px-2 pb-2 text-xs font-bold text-neutral-400 border-b border-neutral-800/80 mb-2.5">
                    <span>تصفح حسب القسم والأصناف الفرعية</span>
                    <Link
                      href="/catalog"
                      onClick={() => setIsCategoriesOpen(false)}
                      className="text-red-500 hover:underline text-[11px]"
                    >
                      عرض الكل ←
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => (
                      <div key={cat.id} className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/70 space-y-2">
                        <Link
                          href={cat.id === 'all' ? '/catalog' : `/catalog?category=${cat.id}`}
                          id={`category-item-${cat.id}`}
                          onClick={() => setIsCategoriesOpen(false)}
                          className="flex items-center justify-between text-xs font-bold text-neutral-100 hover:text-red-400 transition group"
                        >
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(cat.icon)}
                            <span>{cat.label}</span>
                          </div>
                          <span className="text-[10px] text-neutral-500 group-hover:text-red-500 transition">
                            عرض
                          </span>
                        </Link>

                        {/* Subcategory Pills */}
                        {cat.subcategories && cat.subcategories.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {cat.subcategories.slice(0, 5).map((sub) => (
                              <Link
                                key={sub.id}
                                href={
                                  cat.id === 'all'
                                    ? `/catalog?genre=${sub.id}`
                                    : `/catalog?category=${cat.id}&genre=${sub.id}`
                                }
                                onClick={() => setIsCategoriesOpen(false)}
                                className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-red-600 hover:text-white text-[10px] text-neutral-400 transition border border-neutral-800/80"
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Watchlist Link */}
            <Link
              href="/watchlist"
              id="nav-link-watchlist"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                pathname === '/watchlist'
                  ? 'text-white bg-neutral-900 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Bookmark className="w-4 h-4 text-red-500" />
              <span>قائمتي</span>
              {mounted && watchlist.length > 0 && (
                <span
                  id="watchlist-badge-count"
                  className="px-1.5 py-0.2 text-[11px] rounded-full bg-red-600 text-white font-bold"
                >
                  {watchlist.length}
                </span>
              )}
            </Link>

            {/* LinkGrabber Tool Link */}
            <Link
              href="/linkgrabber"
              id="nav-link-linkgrabber"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                pathname === '/linkgrabber'
                  ? 'text-white bg-red-600/20 text-red-400 font-semibold border border-red-500/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Layers className="w-4 h-4 text-red-500" />
              <span>محلل الروابط (LinkGrabber)</span>
            </Link>
          </nav>
        </div>

        {/* Right Action Group */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-1 justify-end max-w-md">
          {/* Desktop Search Bar (Medium & Large screens) */}
          <form
            onSubmit={handleSearchSubmit}
            id="search-form-header"
            className="hidden md:flex relative flex-1 max-w-xs"
          >
            <input
              type="text"
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن فيلم أو مسلسل..."
              className="w-full bg-neutral-900/90 text-xs sm:text-sm text-white placeholder-neutral-500 pl-4 pr-9 py-2 rounded-full border border-neutral-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/30 transition shadow-inner"
            />
            <button
              type="submit"
              id="search-submit-btn"
              className="absolute right-3 top-2.5 text-neutral-400 hover:text-white transition cursor-pointer"
              aria-label="بحث"
            >
              <Search className="w-4 h-4 text-red-500" />
            </button>
          </form>

          {/* Expandable Mobile Search Toggle Icon Button */}
          <button
            type="button"
            id="mobile-search-toggle-btn"
            onClick={() => {
              setIsMobileSearchOpen(!isMobileSearchOpen);
              if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/90 transition active:scale-95 cursor-pointer shrink-0"
            aria-label="فتح البحث"
          >
            {isMobileSearchOpen ? (
              <X className="w-4.5 h-4.5 text-red-500" />
            ) : (
              <Search className="w-4.5 h-4.5 text-red-500" />
            )}
          </button>

          {/* User Profile Avatar / Quick Link */}
          {currentUser ? (
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                type="button"
                id="user-profile-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-neutral-800/80 border border-neutral-800 transition cursor-pointer"
              >
                {currentUser.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-red-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-700 flex items-center justify-center text-white text-xs font-bold border border-neutral-700">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <span className="hidden lg:block text-xs font-medium text-neutral-200 max-w-[90px] truncate">
                  {currentUser.displayName || 'حسابي'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
              </button>

              {isUserMenuOpen && (
                <div
                  id="user-profile-dropdown"
                  className="absolute left-0 mt-2 w-56 bg-neutral-900/98 backdrop-blur-xl border border-neutral-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="px-3 py-2.5 border-b border-neutral-800/80">
                    <p className="text-sm font-semibold text-white truncate">
                      {currentUser.displayName || 'المستخدم'}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {currentUser.email}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      متزامن مع Firestore
                    </div>
                  </div>

                  <div className="mt-1 space-y-1">
                    <Link
                      href="/watchlist"
                      id="dropdown-user-watchlist"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
                    >
                      <span className="flex items-center gap-2">
                        <Bookmark className="w-3.5 h-3.5 text-red-500" />
                        قائمة المشاهدة السحابية
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                        {watchlist.length}
                      </span>
                    </Link>

                    <button
                      type="button"
                      id="dropdown-logout-btn"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              id="scroll-to-bottom-login-btn"
              onClick={() => {
                const bottomLogin = document.getElementById('bottom-login-section');
                if (bottomLogin) {
                  bottomLogin.scrollIntoView({ behavior: 'smooth' });
                } else {
                  handleGoogleSignIn();
                }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 h-10 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-800 transition active:scale-95 cursor-pointer shrink-0"
              title="تسجيل الدخول في أسفل الصفحة"
            >
              <LogIn className="w-3.5 h-3.5 text-red-500" />
              <span>تسجيل الدخول ↓</span>
            </button>
          )}

          {/* Mobile Menu Drawer Toggle Button */}
          <button
            type="button"
            id="mobile-menu-toggle-btn"
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              if (isMobileSearchOpen) setIsMobileSearchOpen(false);
            }}
            className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition active:scale-95 cursor-pointer shrink-0"
            aria-label={isMobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-red-500" />
            ) : (
              <LayoutGrid className="w-5 h-5 text-neutral-300" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Mobile Search Bar (Popdown Banner) */}
      {isMobileSearchOpen && (
        <div
          id="expandable-mobile-search-bar"
          className="md:hidden bg-neutral-950/98 backdrop-blur-xl border-b border-neutral-800 px-3 py-2.5 animate-in slide-in-from-top-2 duration-150"
        >
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={mobileSearchInputRef}
                type="text"
                id="search-input-mobile-expandable"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن فيلم أو مسلسل..."
                className="w-full bg-neutral-900 text-sm text-white placeholder-neutral-500 pl-4 pr-10 h-11 rounded-xl border border-neutral-800 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/30 transition shadow-inner"
              />
              <Search className="w-4.5 h-4.5 text-red-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
            <button
              type="submit"
              className="h-11 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
            >
              بحث
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Menu (Slide-in / Popdown Drawer) */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu-drawer"
          className="absolute top-full left-0 right-0 z-50 lg:hidden bg-neutral-950/98 backdrop-blur-2xl border-b border-neutral-800 shadow-2xl max-h-[85vh] overflow-y-auto px-4 pt-4 pb-8 space-y-5 animate-in slide-in-from-top-2 duration-200"
        >
          {/* Mobile Nav Links Grid with 44px Touch Targets */}
          <div className="grid grid-cols-2 gap-2 text-center text-sm font-medium">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-center gap-2 h-11 px-3 rounded-xl transition cursor-pointer ${
                pathname === '/'
                  ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-950/50'
                  : 'bg-neutral-900/90 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Home className="w-4 h-4 text-white" />
              <span>الرئيسية</span>
            </Link>

            <Link
              href="/catalog?type=movie"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-center gap-2 h-11 px-3 rounded-xl transition cursor-pointer ${
                pathname.includes('type=movie')
                  ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-950/50'
                  : 'bg-neutral-900/90 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Film className="w-4 h-4 text-red-400" />
              <span>الأفلام</span>
            </Link>

            <Link
              href="/catalog?type=series"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-center gap-2 h-11 px-3 rounded-xl transition cursor-pointer ${
                pathname.includes('type=series')
                  ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-950/50'
                  : 'bg-neutral-900/90 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Tv className="w-4 h-4 text-emerald-400" />
              <span>المسلسلات</span>
            </Link>

            <Link
              href="/watchlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-center gap-2 h-11 px-3 rounded-xl transition cursor-pointer ${
                pathname === '/watchlist'
                  ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-950/50'
                  : 'bg-neutral-900/90 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>قائمتي {mounted && watchlist.length > 0 ? `(${watchlist.length})` : ''}</span>
            </Link>

            <Link
              href="/linkgrabber"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`col-span-2 flex items-center justify-center gap-2 h-11 px-3 rounded-xl border font-semibold transition cursor-pointer ${
                pathname === '/linkgrabber'
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/50'
                  : 'bg-red-600/15 text-red-400 border-red-500/30 hover:bg-red-600/25'
              }`}
            >
              <Layers className="w-4.5 h-4.5 text-red-500" />
              <span>محلل الروابط (LinkGrabber)</span>
            </Link>
          </div>

          {/* Categories & Subcategories Grid Section */}
          <div className="border-t border-neutral-900 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
              <span>تصفح حسب القسم والأصناف الفرعية</span>
              <Link
                href="/catalog"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-red-500 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>عرض المكتبة كاملة</span>
                <ArrowRight className="w-3 h-3 rotate-180" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-2.5">
                  <Link
                    href={cat.id === 'all' ? '/catalog' : `/catalog?category=${cat.id}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between h-11 px-2.5 rounded-lg bg-neutral-950/80 hover:bg-neutral-950 text-xs font-bold text-neutral-100 border border-neutral-800/50 transition"
                  >
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(cat.icon)}
                      <span>{cat.label}</span>
                    </div>
                    <span className="text-[11px] text-red-400 font-medium">تصفح ←</span>
                  </Link>

                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {cat.subcategories.slice(0, 5).map((sub) => (
                        <Link
                          key={sub.id}
                          href={
                            cat.id === 'all'
                              ? `/catalog?genre=${sub.id}`
                              : `/catalog?category=${cat.id}&genre=${sub.id}`
                          }
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="px-3 min-h-[36px] flex items-center justify-center rounded-lg bg-neutral-950 text-xs text-neutral-300 hover:text-white border border-neutral-800/80 transition active:scale-95"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Account Footer Action in Mobile Drawer */}
          <div className="border-t border-neutral-900 pt-4">
            {currentUser ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-10 h-10 rounded-full object-cover border border-red-500/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser.displayName || 'المستخدم'}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="h-10 px-3 flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 rounded-xl border border-red-800/40 transition shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleGoogleSignIn();
                }}
                disabled={authLoading}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xs shadow-lg shadow-red-950/50 transition active:scale-95 cursor-pointer disabled:opacity-60 border border-red-500/50"
              >
                <LogIn className="w-4 h-4" />
                <span>{authLoading ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول عبر Google'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
