import React from 'react';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import MediaCard from '@/components/MediaCard';
import { CATEGORIES } from '@/lib/catalog-data';
import { getCatalogItems } from '@/lib/scraper-service';
import CatalogFilters from '@/components/CatalogFilters';

export const revalidate = 60; // Cache for 60 seconds

export default async function CatalogPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const params = await searchParams;
  const activeCategory = (params.category as string) || 'all';
  const activeSubcategory = (params.genre as string) || (params.subcategory as string) || 'all';
  const activeType = (params.type as string) || 'all';
  const activeSort = (params.sort as string) || 'latest';
  const activePage = parseInt((params.page as string) || '1', 10);

  const result = await getCatalogItems({
    category: activeCategory,
    subcategory: activeSubcategory,
    type: activeType !== 'all' ? activeType : undefined,
    sort: activeSort,
    page: activePage,
    limit: 18,
  });

  const items = result.items;
  const foundCat = CATEGORIES.find((c) => c.id === activeCategory);
  const activeCategoryTitle = foundCat ? foundCat.label : 'جميع التصنيفات';

  return (
    <div className="w-full space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6" dir="rtl">
      {/* Category Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-red-500 font-mono">
            <LayoutGrid className="w-4 h-4" />
            <span>تصفح الكتالوج وفلترة الأقسام</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white">
            {activeCategoryTitle}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            استعرض الأفلام والمسلسلات بحسب التصنيف والجودة وسنة الإصدار
          </p>
        </div>
      </div>

      {/* Categories Filter Tabs (Desktop & Mobile Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          
          // Build new search params for link
          const linkParams = new URLSearchParams();
          if (cat.id !== 'all') linkParams.set('category', cat.id);
          if (activeType !== 'all') linkParams.set('type', activeType);
          if (activeSort !== 'latest') linkParams.set('sort', activeSort);
          
          const href = `/catalog${linkParams.toString() ? `?${linkParams.toString()}` : ''}`;
          
          return (
            <Link
              key={cat.id}
              href={href}
              className={`flex-shrink-0 px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-semibold transition border cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/40'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>

      {/* Sub-Filters: Categories, Subcategories, Type (Movies / Series) and Sort */}
      <CatalogFilters
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        activeType={activeType}
        activeSort={activeSort}
      />

      {/* Items Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="p-10 sm:p-16 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800/60 space-y-3">
          <p className="text-neutral-400 text-sm">لم يتم العثور على أي أعمال في هذا التصنيف حالياً.</p>
          <Link
            href="/catalog"
            className="inline-flex px-5 py-2.5 min-h-[44px] rounded-xl bg-red-600 text-white text-xs font-semibold items-center justify-center cursor-pointer active:scale-95"
          >
            إعادة تعيين الفلاتر
          </Link>
        </div>
      )}
    </div>
  );
}
