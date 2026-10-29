'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Error:', error);
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk');

    if (isChunkError) {
      const reloadKey = 'chunk_error_reload_' + (typeof window !== 'undefined' ? window.location.pathname : '');
      if (typeof window !== 'undefined' && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    }
  }, [error]);

  const handleRetry = () => {
    if (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk')
    ) {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4" dir="rtl">
      <h1 className="text-4xl font-extrabold text-red-500 mb-3">حدث خطأ في تحميل الصفحة</h1>
      <p className="text-neutral-300 mb-6 max-w-md text-sm leading-relaxed">
        حدث انقطاع مؤقت أثناء تحميل ملفات التطبيق. يمكنك إعادة المحاولة فوراً لتنشيط الاتصال.
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleRetry}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-600/30"
        >
          إعادة التحميل
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors border border-neutral-700"
        >
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
