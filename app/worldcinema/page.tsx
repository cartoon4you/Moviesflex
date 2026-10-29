'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { safeFetchJson } from '@/lib/utils';

// ==================== CONFIG & TYPES ====================
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const IMAGE_THUMB = 'https://image.tmdb.org/t/p/w92';
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 750'%3E%3Crect fill='%23121212' width='500' height='750'/%3E%3Ctext fill='%23333' font-family='system-ui' font-size='80' x='250' y='390' text-anchor='middle'%3E%F0%9F%8E%AC%3C/text%3E%3Ctext fill='%23555' font-family='system-ui' font-size='20' x='250' y='430' text-anchor='middle'%3ENo Poster%3C/text%3E%3C/svg%3E";

const GENRES = [
  { id: 28, name: 'أكشن (Action)' }, { id: 12, name: 'مغامرة (Adventure)' }, { id: 16, name: 'أنمي (Animation)' },
  { id: 35, name: 'كوميدي (Comedy)' }, { id: 80, name: 'جريمة (Crime)' }, { id: 99, name: 'وثائقي (Documentary)' },
  { id: 18, name: 'دراما (Drama)' }, { id: 10751, name: 'عائلي (Family)' }, { id: 14, name: 'فانتازيا (Fantasy)' },
  { id: 36, name: 'تاريخي (History)' }, { id: 27, name: 'رعب (Horror)' }, { id: 10402, name: 'موسيقي (Music)' },
  { id: 9648, name: 'غموض (Mystery)' }, { id: 10749, name: 'رومانسي (Romance)' }, { id: 878, name: 'خيال علمي (Sci-Fi)' },
  { id: 10770, name: 'تلفزيوني (TV Movie)' }, { id: 53, name: 'إثارة (Thriller)' }, { id: 10752, name: 'حرب (War)' }, { id: 37, name: 'غربي (Western)' },
];

const SERVERS = [
  { id: 'vidsrc', label: '🚀 VidSrc' },
  { id: 'yapgrid', label: '⭐ YapGrid (ترجمة مدمجة)' },
  { id: 'vidlink', label: '🚀 VidLink' },
  { id: 'vidcore', label: '🎞️ VidCore' },
  { id: 'vidsrcmov', label: '⚡ VidSrc MOV' },
  { id: 'multiembed', label: '⚡ MultiEmbed' },
  { id: '2embed', label: '🎬 2Embed' },
  { id: 'smashy', label: '📡 SmashyStream' },
  { id: 'moviesapi', label: '🎞️ MoviesAPI' },
  { id: 'autoembed', label: '🌐 AutoEmbed' },
];

const YEAR_OPTIONS = [
  { v: '', l: 'جميع السنوات' },
  { v: '2026', l: '2026' },
  { v: '2025', l: '2025' },
  { v: '2024', l: '2024' },
  { v: '2023', l: '2023' },
  { v: '2020s', l: '2020 - 2022' },
  { v: 'classic', l: 'كلاسيكيات (قبل 1990)' },
];

interface Toast {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info';
}

const SERVER_STORAGE_KEY = 'world_cinema_server';

export default function WorldCinemaContent() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [mediaType, setMediaType] = useState<string>('movie');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('popularity.desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // تفاصيل المسلسلات
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  // المشغل والقوائم
  const [serverProvider, setServerProvider] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SERVER_STORAGE_KEY);
        if (saved && SERVERS.some((s) => s.id === saved)) return saved;
      } catch {}
    }
    return 'vidsrc';
  });
  const [playerUrl, setPlayerUrl] = useState<string>('');
  const [isPlayerActive, setIsPlayerActive] = useState<boolean>(false);
  const [playerLoading, setPlayerLoading] = useState<boolean>(false);

  // القائمة الجانبية والإعلان
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ---------- Toast ---------- */
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  /* ---------- Persist server choice ---------- */
  useEffect(() => {
    try { localStorage.setItem(SERVER_STORAGE_KEY, serverProvider); } catch {}
  }, [serverProvider]);

  /* ---------- Ctrl+K search shortcut ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- Reset Home ---------- */
  const handleResetToHome = useCallback(() => {
    setSelectedGenre('');
    setSelectedYear('');
    setSelectedSort('popularity.desc');
    setSearchQuery('');
    setMediaType('movie');
    setPage(1);
    setIsPlayerActive(false);
    setPlayerUrl('');
    setSelectedMedia(null);
    setSeasons([]);
    setEpisodes([]);
    setSelectedSeason(1);
    setSelectedEpisode(1);
    setTrailerKey(null);
    showToast('🏠 تم العودة للرئيسية بنجاح', 'success');
  }, [showToast]);

  /* ---------- TMDB fetch (via proxy) ---------- */
  const fetchTMDB = useCallback(async (endpoint: string, signal?: AbortSignal) => {
    try {
      const result = await safeFetchJson<any>(
        `/api/tmdb?endpoint=${encodeURIComponent(endpoint)}`,
        { signal }
      );
      if (!result.ok || !result.data) return { results: [] };
      return result.data;
    } catch (err: any) {
      if (err?.name === 'AbortError') return null;
      return { results: [] };
    }
  }, []);

  /* ---------- Embed URL Builder ---------- */
  const getEmbedUrl = useCallback((
    type: string,
    media: any,
    s: number,
    ep: number,
    provider: string
  ) => {
    if (!media) return '';
    const tmdbId = media.id;
    const imdbId = media.external_ids?.imdb_id || tmdbId;

    switch (provider) {
      case 'vidsrc':
        return type === 'tv'
          ? `https://vidsrcme.ru/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${ep}&ds_lang=ar&autonext=1&autoplay=1&mute=1`
          : `https://vidsrcme.ru/embed/movie?imdb=${imdbId}&ds_lang=ar&autoplay=1&mute=1`;
      case 'yapgrid':
        return type === 'tv'
          ? `https://yapgrid.com/embed/tv/${tmdbId}/${s}/${ep}?autoplay=1&lang=ar`
          : `https://yapgrid.com/embed/movie/${tmdbId}?autoplay=1&lang=ar`;
      case 'vidlink':
        return type === 'tv'
          ? `https://vidlink.pro/tv/${tmdbId}/${s}/${ep}?primaryColor=e50914&autoplay=1&sub_lang=ar`
          : `https://vidlink.pro/movie/${tmdbId}?primaryColor=e50914&autoplay=1&sub_lang=ar`;
      case 'vidcore':
        return type === 'tv'
          ? `https://vidcore.org/embed/tv/${tmdbId}/${s}/${ep}?theme=e50914&autoplay=true&lang=ar`
          : `https://vidcore.org/embed/movie/${tmdbId}?theme=e50914&autoplay=true&lang=ar`;
      case 'vidsrcmov':
        return type === 'tv'
          ? `https://vidsrc.mov/embed/tv/${tmdbId}/${s}/${ep}?sub_lang=ar`
          : `https://vidsrc.mov/embed/movie/${tmdbId}?sub_lang=ar`;
      case 'multiembed':
        return type === 'tv'
          ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${ep}&autoplay=1`
          : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&autoplay=1`;
      case '2embed':
        return type === 'tv'
          ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${ep}`
          : `https://www.2embed.cc/embed/${imdbId}`;
      case 'smashy':
        return type === 'tv'
          ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${s}&episode=${ep}`
          : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`;
      case 'moviesapi':
        return type === 'tv'
          ? `https://moviesapi.club/tv/${tmdbId}-${s}-${ep}`
          : `https://moviesapi.club/movie/${tmdbId}`;
      case 'autoembed':
        return type === 'tv'
          ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${s}/${ep}`
          : `https://player.autoembed.cc/embed/movie/${tmdbId}`;
      default:
        return '';
    }
  }, []);

  /* ---------- Load Episodes (BUGFIX: pass show explicitly) ---------- */
  const loadEpisodes = useCallback(async (showId: number, seasonNum: number, show: any) => {
    setSelectedSeason(seasonNum);
    setPlayerLoading(true);
    const data = await fetchTMDB(`/tv/${showId}/season/${seasonNum}?language=ar-SA`);
    if (data?.episodes) {
      setEpisodes(data.episodes);
      if (data.episodes.length > 0) {
        setSelectedEpisode(1);
        setPlayerUrl(getEmbedUrl('tv', show || selectedMedia, seasonNum, 1, serverProvider));
      }
    }
    setPlayerLoading(false);
  }, [fetchTMDB, getEmbedUrl, serverProvider, selectedMedia]);

  /* ---------- Filter / Browse effect ---------- */
  useEffect(() => {
    if (searchQuery.trim()) return; // search mode handles itself
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const params = [
          `language=ar-SA`,
          `sort_by=${selectedSort}`,
          `page=${page}`,
          `include_adult=false`,
        ];
        if (selectedGenre) params.push(`with_genres=${selectedGenre}`);
        if (selectedYear) {
          if (selectedYear === 'classic') {
            params.push(`primary_release_date.lte=1989-12-31`);
          } else if (selectedYear === '2020s') {
            params.push(`primary_release_date.gte=2020-01-01&primary_release_date.lte=2022-12-31`);
          } else {
            params.push(
              mediaType === 'movie'
                ? `primary_release_year=${selectedYear}`
                : `first_air_date_year=${selectedYear}`
            );
          }
        }

        const data = await fetchTMDB(`/discover/${mediaType}?${params.join('&')}`, controller.signal);
        if (controller.signal.aborted) return;
        if (data) {
          setMovies(Array.isArray(data.results) ? data.results : []);
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [mediaType, selectedGenre, selectedYear, selectedSort, page, searchQuery, fetchTMDB]);

  /* ---------- Debounced search ---------- */
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setLoading(true);
      const data = await fetchTMDB(
        `/search/multi?query=${encodeURIComponent(searchQuery)}&language=ar-SA`,
        controller.signal
      );
      if (controller.signal.aborted) return;
      if (data) {
        const filtered = (data.results || []).filter(
          (i: any) => i.media_type === 'movie' || i.media_type === 'tv'
        );
        setMovies(filtered);
        setTotalPages(1);
        setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [searchQuery, fetchTMDB]);

  /* ---------- Open media ---------- */
  const openMedia = useCallback(async (id: number, type: string) => {
    // 1. Find basic data from current list immediately
    const basicItem = movies.find(m => m.id === id);
    if (basicItem) {
        setSelectedMedia({ ...basicItem, mediaType: type });
        setIsPlayerActive(true);
    }
    
    // 2. Fetch full details in background
    setPlayerLoading(true);
    const details = await fetchTMDB(
      `/${type}/${id}?language=ar-SA&append_to_response=external_ids,credits,videos`
    );
    if (!details) { setPlayerLoading(false); return; }

    setSelectedMedia({ ...details, mediaType: type });

    // Handle trailer and servers
    if (type === 'tv') {
      const filteredSeasons = (details.seasons || []).filter((s: any) => s.season_number > 0);
      setSeasons(filteredSeasons);
      if (filteredSeasons.length > 0) {
        const firstSeason = filteredSeasons[0].season_number;
        setSelectedSeason(firstSeason);
        const epData = await fetchTMDB(`/tv/${id}/season/${firstSeason}?language=ar-SA`);
        setEpisodes(epData?.episodes || []);
        setSelectedEpisode(1);
        setPlayerUrl(getEmbedUrl('tv', details, firstSeason, 1, serverProvider));
      }
    } else {
      setPlayerUrl(getEmbedUrl(type, details, 0, 0, serverProvider));
    }

    const trailer = (details.videos?.results || []).find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    );
    setTrailerKey(trailer ? trailer.key : null);
    setIsPlayerActive(true);
    setPlayerLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchTMDB, getEmbedUrl, serverProvider, movies]);

  /* ---------- Server change ---------- */
  const handleServerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setServerProvider(val);
    if (selectedMedia) {
      setPlayerLoading(true);
      setPlayerUrl(
        getEmbedUrl(
          selectedMedia.mediaType,
          selectedMedia,
          selectedSeason,
          selectedEpisode,
          val
        )
      );
    }
    showToast('🔄 تم تغيير السيرفر', 'success');
  }, [selectedMedia, selectedSeason, selectedEpisode, getEmbedUrl, showToast]);

  /* ---------- Filter change handlers (reset page to 1) ---------- */
  const changeMediaType = (v: string) => { setMediaType(v); setPage(1); };
  const changeGenre = (v: string) => { setSelectedGenre(v); setPage(1); };
  const changeYear = (v: string) => { setSelectedYear(v); setPage(1); };
  const changeSort = (v: string) => { setSelectedSort(v); setPage(1); };

  return (
    <div dir="rtl" className="min-h-screen bg-[#070707] text-white font-sans overflow-x-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-[76px] left-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-[#181818] border border-white/10 border-r-4 rounded-xl px-4 py-3 text-[13px] font-semibold shadow-lg ${
              t.type === 'error' ? 'border-r-red-500' : t.type === 'info' ? 'border-r-blue-500' : 'border-r-[#e50914]'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Trailer Modal */}
      {trailerKey && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
          <div className="relative w-full max-w-[900px] aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setTrailerKey(null)}
              className="absolute top-3 right-3 bg-[#e50914] hover:bg-red-700 text-white w-9 h-9 rounded-full cursor-pointer z-10 flex items-center justify-center font-bold transition-all"
            >
              ✕
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
              className="w-full h-full border-none"
              allowFullScreen
              title="Trailer Player"
            />
          </div>
        </div>
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/75 z-[1100]" onClick={() => setIsSidebarOpen(false)}>
          <aside
            className="fixed top-0 right-0 w-[280px] max-w-[80vw] h-screen bg-[#111] border-l border-white/10 z-[1200] p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
              <span className="font-bold">📁 التصنيفات</span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-[#aaa] hover:text-white cursor-pointer bg-none border-none text-[22px]"
              >
                ✕
              </button>
            </div>
            {GENRES.map((g) => (
              <div
                key={g.id}
                onClick={() => {
                  changeGenre(String(g.id));
                  setIsSidebarOpen(false);
                }}
                className={`py-3.5 px-4 rounded-xl text-[14px] cursor-pointer mb-2 transition-all ${
                  selectedGenre === String(g.id)
                    ? 'bg-[#e50914] text-white'
                    : 'bg-[#181818] text-[#ddd] hover:bg-[#222]'
                }`}
              >
                {g.name}
              </div>
            ))}
          </aside>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-[1000] bg-[#070707]/95 backdrop-blur-2xl border-b border-white/10">
        <div className="w-[min(1400px,calc(100%-24px))] mx-auto h-16 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="bg-transparent border border-white/10 text-white p-2.5 rounded-[10px] cursor-pointer hover:bg-white/5"
            >
              ☰
            </button>

            <a
              href="#"
              onClick={(e) => { e.preventDefault(); handleResetToHome(); }}
              className="flex items-center gap-1.5 text-[18px] font-black no-underline text-white"
            >
              <span className="w-8 h-8 rounded-lg grid place-items-center bg-[#e50914] text-[14px]">▶</span>
              <span>
                movies<span className="text-[#e50914]">io</span>
              </span>
            </a>

            <Link href="/" className="no-underline hidden sm:block">
              <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all">
                🏠 الرئيسية
              </button>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-3">
              <button
                onClick={handleResetToHome}
                className="text-[#aaa] hover:text-white bg-none border-none cursor-pointer text-xs font-bold"
              >
                الرئيسية
              </button>
              <button
                onClick={() => changeMediaType('movie')}
                className={`bg-none border-none cursor-pointer text-xs font-bold transition-all ${
                  mediaType === 'movie' ? 'text-white border-b-2 border-[#e50914] pb-1' : 'text-[#aaa]'
                }`}
              >
                أفلام
              </button>
              <button
                onClick={() => changeMediaType('tv')}
                className={`bg-none border-none cursor-pointer text-xs font-bold transition-all ${
                  mediaType === 'tv' ? 'text-white border-b-2 border-[#e50914] pb-1' : 'text-[#aaa]'
                }`}
              >
                مسلسلات
              </button>
            </div>

            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن فيلم أو مسلسل... (Ctrl+K)"
              className="w-[140px] sm:w-[240px] h-[38px] px-3 border border-white/10 rounded-[10px] bg-[#111] text-white text-[13px] outline-none focus:border-[#e50914] transition-all"
            />
          </div>
        </div>
      </header>

      <main className="w-[min(1400px,calc(100%-24px))] mx-auto py-4">
        {/* Hero */}
        <section className="relative pt-3 pb-2 mb-2">
          <h1 className="text-[26px] sm:text-[36px] font-black mb-1">
            عالم السينما <span className="text-[#e50914]">بدون حدود</span>
          </h1>
          <p className="text-[#bbb] text-[13px] sm:text-[15px]">
            شاهد مسلسلاتك من حيث توقفت، مع تشغيل تلقائي للحلقات، بأقوى سيرفرات عالمية وبدون تقطيع.
          </p>
        </section>

        {/* Filters */}
        <div className="bg-[#181818] border border-white/10 rounded-xl p-3 my-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={mediaType}
            onChange={(e) => changeMediaType(e.target.value)}
            className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px] outline-none"
          >
            <option value="movie">🎬 أفلام</option>
            <option value="tv">📺 مسلسلات</option>
          </select>
          <select
            value={selectedGenre}
            onChange={(e) => changeGenre(e.target.value)}
            className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px] outline-none"
          >
            <option value="">جميع التصنيفات</option>
            {GENRES.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => changeYear(e.target.value)}
            className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px] outline-none"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y.v} value={y.v}>{y.l}</option>
            ))}
          </select>
          <select
            value={selectedSort}
            onChange={(e) => changeSort(e.target.value)}
            className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px] outline-none"
          >
            <option value="popularity.desc">🔥 الأكثر شعبية</option>
            <option value="vote_average.desc">⭐ الأعلى تقييماً</option>
            <option value="primary_release_date.desc">🆕 الأحدث</option>
          </select>
        </div>

        {/* Detail & Player Panel */}
        {isPlayerActive && selectedMedia && (
          <div className="my-4 p-4 border border-white/15 rounded-2xl bg-[#171717] shadow-xl">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    selectedMedia.poster_path
                      ? `${IMAGE_BASE}${selectedMedia.poster_path}`
                      : PLACEHOLDER_IMAGE
                  }
                  alt={selectedMedia.title || selectedMedia.name}
                  className="w-[110px] h-[165px] sm:w-[140px] sm:h-[210px] object-cover rounded-[10px] shrink-0"
                />
                <div className="flex-1">
                  <h2 className="text-[20px] sm:text-[24px] mb-1.5 font-black">
                    {selectedMedia.title || selectedMedia.name}
                  </h2>
                  <p className="text-[#bbb] text-[12px] sm:text-[13px] leading-relaxed mb-3 line-clamp-4">
                    {selectedMedia.overview || 'لا يوجد وصف متوفر.'}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setIsPlayerActive(false);
                        setPlayerUrl('');
                      }}
                      className="bg-[#333] hover:bg-[#444] text-white px-3 py-1.5 rounded-md cursor-pointer border-none text-xs transition-all"
                    >
                      إغلاق المشغل
                    </button>
                    {trailerKey && (
                      <button
                        onClick={() => window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank')}
                        className="bg-[#e50914] hover:bg-red-700 text-white px-3 py-1.5 rounded-md cursor-pointer border-none text-xs transition-all"
                      >
                        🎬 الإعلان
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {selectedMedia.mediaType === 'tv' && (
                <div className="mt-2.5 border-t md:border-t-0 md:border-r border-white/10 pt-2.5 md:pt-0 md:pr-4 w-full">
                  <div className="flex gap-2 mb-2 flex-wrap items-center">
                    <span className="text-xs font-bold text-[#888]">الموسم:</span>
                    <select
                      value={selectedSeason}
                      onChange={(e) =>
                        loadEpisodes(selectedMedia.id, Number(e.target.value), selectedMedia)
                      }
                      className="py-1.5 px-2.5 bg-[#111] text-white rounded-lg text-[13px] border border-white/10 outline-none"
                    >
                      {seasons.map((s: any) => (
                        <option key={s.season_number} value={s.season_number}>
                          الموسم {s.season_number}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1.5 flex-nowrap overflow-x-auto pb-2">
                    {episodes.map((ep: any) => (
                      <button
                        key={ep.episode_number}
                        onClick={() => {
                          setSelectedEpisode(ep.episode_number);
                          setPlayerLoading(true);
                          setPlayerUrl(
                            getEmbedUrl(
                              'tv',
                              selectedMedia,
                              selectedSeason,
                              ep.episode_number,
                              serverProvider
                            )
                          );
                        }}
                        className={`py-1.5 px-3 rounded-md cursor-pointer border-none text-xs whitespace-nowrap shrink-0 transition-all ${
                          selectedEpisode === ep.episode_number
                            ? 'bg-[#e50914] text-white font-bold'
                            : 'bg-[#222] text-[#ccc] hover:bg-[#333]'
                        }`}
                      >
                        حلقة {ep.episode_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Player Container */}
            <div className="mt-4 border border-white/10 rounded-xl overflow-hidden bg-black shadow-lg">
              <div className="py-2.5 px-3 bg-[#111] flex justify-between items-center border-b border-white/5 gap-2 flex-wrap">
                <span className="text-xs font-extrabold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                  مشغل moviesio Pro
                </span>
                <select
                  value={serverProvider}
                  onChange={handleServerChange}
                  className="py-1 px-2.5 bg-[#222] text-white rounded-md border-none text-xs outline-none cursor-pointer"
                >
                  {SERVERS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative w-full aspect-video">
                {playerLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85">
                    <div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                    <span className="mt-2 text-xs text-[#aaa]">جاري تجهيز السيرفر...</span>
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  src={playerUrl}
                  onLoad={() => setPlayerLoading(false)}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  title="Content Player"
                />
              </div>
            </div>
          </div>
        )}

        {/* Grid Results */}
        {loading ? (
          <div className="text-center py-20 text-[#aaa] text-[14px] flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
            <span>جاري تحميل المحتوى...</span>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20 text-[#777] text-[14px]">
            <div className="text-[42px] mb-2 opacity-60">🎬</div>
            <div>لا توجد نتائج مطابقة.</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
              {movies.map((item) => {
                const type = item.media_type || mediaType;
                const title = item.title || item.name || 'بدون عنوان';
                const poster = item.poster_path
                  ? `${IMAGE_BASE}${item.poster_path}`
                  : PLACEHOLDER_IMAGE;

                return (
                  <div
                    key={item.id}
                    onClick={() => openMedia(item.id, type)}
                    className="group rounded-[10px] bg-[#121212] border border-white/5 cursor-pointer overflow-hidden flex flex-col hover:border-white/20 hover:scale-[1.02] transition-all duration-200 shadow-md"
                  >
                    <div className="aspect-[2/3] overflow-hidden relative bg-[#0e0e0e]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={poster}
                        alt={title}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="w-10 h-10 rounded-full bg-[#e50914] flex items-center justify-center text-white font-bold shadow-lg">
                          ▶
                        </span>
                      </div>
                    </div>
                    <div className="p-2 flex-1 flex flex-col justify-between">
                      <h3 className="text-xs whitespace-nowrap overflow-hidden text-ellipsis font-bold text-gray-200 group-hover:text-white">
                        {title}
                      </h3>
                      <div className="flex justify-between items-center mt-1.5 text-[10px] text-[#888]">
                        <span className="bg-white/5 px-1.5 py-0.5 rounded">
                          {type === 'tv' ? 'مسلسل' : 'فيلم'}
                        </span>
                        <span className="text-[#ffd700] font-bold">
                          ★ {Number(item.vote_average || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination (hidden during search) */}
            {!searchQuery.trim() && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
                <button
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={page === 1}
                  className="min-w-[38px] h-[38px] px-3 rounded-md bg-[#181818] border border-white/10 text-[#ccc] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#e50914] hover:text-white transition-all"
                >
                  ←
                </button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const start = Math.max(1, Math.min(totalPages - 4, page - 2));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`min-w-[38px] h-[38px] px-3 rounded-md text-xs font-bold transition-all ${
                        p === page
                          ? 'bg-[#e50914] text-white border border-transparent'
                          : 'bg-[#181818] border border-white/10 text-[#ccc] hover:border-[#e50914] hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={page === totalPages}
                  className="min-w-[38px] h-[38px] px-3 rounded-md bg-[#181818] border border-white/10 text-[#ccc] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#e50914] hover:text-white transition-all"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}