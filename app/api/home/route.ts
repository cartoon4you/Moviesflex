import { NextResponse } from 'next/server';
import { getHomeContent } from '@/lib/scraper-service';

export const revalidate = 300;

export async function GET() {
  try {
    const data = await getHomeContent();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'public, s-maxage=3600',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'فشل جلب بيانات الصفحة الرئيسية' },
      { status: 500 }
    );
  }
}
