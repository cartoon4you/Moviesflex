import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const endpoint = url.searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
  }

  const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
  if (!TMDB_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'TMDB_ACCESS_TOKEN is not set' }, { status: 500 });
  }

  const TMDB_BASE = 'https://api.themoviedb.org/3';
  
  try {
    const res = await fetch(`${TMDB_BASE}${endpoint}`, {
      headers: { 
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`, 
        accept: 'application/json' 
      }
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'CDN-Cache-Control': 'public, s-maxage=86400',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.error('TMDB API Error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
