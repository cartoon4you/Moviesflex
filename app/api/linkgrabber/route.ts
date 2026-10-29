import { NextRequest, NextResponse } from 'next/server';
import { deepCrawlTargetPage } from '@/lib/scraper-service';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url') || request.nextUrl.searchParams.get('q') || '';
    if (!url.trim()) {
      return NextResponse.json(
        { success: false, error: 'الرابط المستهدف مطلوب (URL parameter is required)' },
        { status: 400 }
      );
    }

    const result = await deepCrawlTargetPage(url.trim());

    return NextResponse.json({
      success: true,
      data: result,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=43200',
        'CDN-Cache-Control': 'public, s-maxage=1800',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=1800',
      },
    });
  } catch (error: any) {
    console.error('LinkGrabber API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ أثناء فحص واستخراج الروابط' },
      { status: 500 }
    );
  }
}
