import React, { Suspense } from 'react';
import Link from 'next/link';
import {
  Film,
  Tv,
  Flame,
  ChevronLeft,
  LayoutGrid,
  ArrowRight,
  Sparkles,
  User,
} from 'lucide-react';
import HeroSlider from '@/components/HeroSlider';
import MediaCard from '@/components/MediaCard';
import { CATEGORIES } from '@/lib/catalog-data';
import { getHomeContent } from '@/lib/scraper-service';

// Add export for revalidate if you want ISR
export const revalidate = 300;

export default async function HomePage() {
  const data = await getHomeContent();
  
  const featured = data.featured || [];
  const latestMovies = data.latestMovies || [];
  const latestSeries = data.latestSeries || [];
  const trending = data.trending || [];

  return (
    <div className="w-full space-y-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6" dir="rtl">
      
      {/* زر معلوماتي في الأعلى للوصول السريع */}
      <div className="flex justify-end">
        <Link
          href="/worldcinema"
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold border border-neutral-800 transition shadow-md active:scale-95"
        >
          <User className="w-4 h-4 text-red-500" />
          <span>الصفحة العالمية</span>
        </Link>
      </div>

      {/* 1. Hero Carousel Slider */}
      <HeroSlider items={featured} />

      {/* 2. Category Quick Chips Bar */}
      <section id="home-categories-chips" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-300">
            <LayoutGrid className="w-4 h-4 text-red-500" />
            <span>تصفح حسب الأقسام السريعة</span>
          </div>
          <Link
            href="/catalog"
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 font-medium transition"
          >
            <span>عرض كل التصنيفات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === 'all' ? '/catalog' : `/catalog?category=${cat.id}`}
              id={`quick-chip-${cat.id}`}
              className="flex-shrink-0 px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-semibold bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition active:scale-95 cursor-pointer"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Section: Latest Movies */}
      <section id="section-latest-movies" className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-600/10 text-red-500 border border-red-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">أحدث الأفلام</h2>
              <p className="text-xs text-neutral-400">أفلام عربية وأجنبية حصرية بأعلى جودة</p>
            </div>
          </div>

          <Link
            href="/catalog?type=movie"
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition"
          >
            <span>شاهد المزيد</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {latestMovies.slice(0, 5).map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 4. Section: Latest TV Series */}
      <section id="section-latest-series" className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-500 border border-emerald-500/20">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">أحدث المسلسلات والحلقات</h2>
              <p className="text-xs text-neutral-400">مسلسلات عربية وتركية وأجنبية مع مشغل الحلقات المباشر</p>
            </div>
          </div>

          <Link
            href="/catalog?type=series"
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition"
          >
            <span>شاهد المزيد</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {latestSeries.slice(0, 5).map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 5. Section: Trending & Highly Rated */}
      <section id="section-trending" className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-600/10 text-amber-500 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">الأكثر مشاهدة والأعلى تقييماً</h2>
              <p className="text-xs text-neutral-400">أعمال نالت أعلى تقييمات الجمهور والنقاد</p>
            </div>
          </div>

          <Link
            href="/catalog?sort=rating"
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition"
          >
            <span>عرض الترتيب الكامل</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {trending.slice(0, 5).map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}