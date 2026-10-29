'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { safeFetchJson } from '@/lib/utils';

// ==================== CONFIG & TYPES ====================
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/500x750?text=No+Poster';

const GENRES = [
  { id: 28, name: "أكشن (Action)" }, { id: 12, name: "مغامرة (Adventure)" }, { id: 16, name: "أنمي (Animation)" },
  { id: 35, name: "كوميدي (Comedy)" }, { id: 80, name: "جريمة (Crime)" }, { id: 99, name: "وثائقي (Documentary)" },
  { id: 18, name: "دراما (Drama)" }, { id: 10751, name: "عائلي (Family)" }, { id: 14, name: "فانتازيا (Fantasy)" },
  { id: 36, name: "تاريخي (History)" }, { id: 27, name: "رعب (Horror)" }, { id: 10402, name: "موسيقي (Music)" },
  { id: 9648, name: "غموض (Mystery)" }, { id: 10749, name: "رومانسي (Romance)" }, { id: 878, name: "خيال علمي (Sci-Fi)" },
  { id: 10770, name: "تلفزيوني (TV Movie)" }, { id: 53, name: "إثارة (Thriller)" }, { id: 10752, name: "حرب (War)" }, { id: 37, name: "غربي (Western)" }
];

interface Toast {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export default function WorldCinemaContent() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [mediaType, setMediaType] = useState<string>('movie');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('popularity.desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // تفاصيل المسلسلات
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  // المشغل والقوائم
  const [serverProvider, setServerProvider] = useState<string>('vidsrc');
  const [playerUrl, setPlayerUrl] = useState<string>('');
  const [isPlayerActive, setIsPlayerActive] = useState<boolean>(false);

  // القائمة الجانبية والإعلان
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const handleResetToHome = useCallback(() => {
    setSelectedGenre('');
    setSelectedYear('');
    setSelectedSort('popularity.desc');
    setSearchQuery('');
    setMediaType('movie');
    setIsPlayerActive(false);
    setPlayerUrl('');
    setSelectedMedia(null);
    showToast('🏠 تم العودة للرئيسية بنجاح', 'success');
  }, [showToast]);

  const fetchTMDB = async (endpoint: string, signal?: AbortSignal) => {
    try {
      const result = await safeFetchJson<any>(`/api/tmdb?endpoint=${encodeURIComponent(endpoint)}`, { signal });
      if (!result.ok || !result.data) {
        return { results: [] };
      }
      return result.data;
    } catch (err: any) {
      if (err?.name === 'AbortError') return null;
      return { results: [] };
    }
  };

  const getEmbedUrl = useCallback((type: string, media: any, s: number, ep: number, provider: string) => {
    if (!media) return '';
    const tmdbId = media.id;
    const imdbId = media.external_ids?.imdb_id || tmdbId;

    switch (provider) {
      case 'vidsrc':
        return type === 'tv'
          ? `https://vidsrcme.ru/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${ep}&ds_lang=ar&autonext=1&autoplay=1&mute=1`
          : `https://vidsrcme.ru/embed/movie?imdb=${imdbId}&ds_lang=ar&autoplay=1&mute=1`;
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
      case 'vidlink':
        return type === 'tv'
          ? `https://vidlink.pro/tv/${tmdbId}/${s}/${ep}?primaryColor=e50914&autoplay=1`
          : `https://vidlink.pro/movie/${tmdbId}?primaryColor=e50914&autoplay=1`;
      default:
        return '';
    }
  }, []);

  const loadEpisodes = async (showId: number, seasonNum: number) => {
    setSelectedSeason(seasonNum);
    const data = await fetchTMDB(`/tv/${showId}/season/${seasonNum}?language=ar-SA`);
    if (data?.episodes) {
      setEpisodes(data.episodes);
      if (data.episodes.length > 0) {
        setSelectedEpisode(1);
        setPlayerUrl(getEmbedUrl('tv', selectedMedia, seasonNum, 1, serverProvider));
      }
    }
  };

  // فلترة متقدمة وتصفح
  useEffect(() => {
    const controller = new AbortController();
    const applyAdvancedFilters = async (page = 1) => {
      setLoading(true);
      let params = [`language=ar-SA`, `sort_by=${selectedSort}`, `page=${page}`, `include_adult=false`];
      if (selectedGenre) params.push(`with_genres=${selectedGenre}`);
      if (selectedYear) {
        if (selectedYear === 'classic') params.push(`primary_release_date.lte=1989-12-31`);
        else if (selectedYear.includes('s')) {
          const start = selectedYear.replace('s', '');
          params.push(`primary_release_date.gte=${start}-01-01&primary_release_date.lte=${parseInt(start) + 9}-12-31`);
        } else {
          params.push(mediaType === 'movie' ? `primary_release_year=${selectedYear}` : `first_air_date_year=${selectedYear}`);
        }
      }

      const data = await fetchTMDB(`/discover/${mediaType}?${params.join('&')}`, controller.signal);
      if (data) {
        setMovies(data.results || []);
        setLoading(false);
      }
    };

    if (!searchQuery.trim()) {
      applyAdvancedFilters(1);
    }

    return () => controller.abort();
  }, [mediaType, selectedGenre, selectedYear, selectedSort, searchQuery]);

  // البحث الحثيث (Debounced Search)
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const controller = new AbortController();

    const handler = setTimeout(async () => {
      setLoading(true);
      const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(searchQuery)}&language=ar-SA`, controller.signal);
      if (data) {
        const filtered = (data.results || []).filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv');
        setMovies(filtered);
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [searchQuery]);

  const openMedia = async (id: number, type: string) => {
    setServerProvider('vidsrc');
    const details = await fetchTMDB(`/${type}/${id}?language=ar-SA&append_to_response=external_ids,credits,videos`);
    if (!details) return;

    setSelectedMedia({ ...details, mediaType: type });

    if (type === 'tv') {
      const filteredSeasons = (details.seasons || []).filter((s: any) => s.season_number > 0);
      setSeasons(filteredSeasons);
      if (filteredSeasons.length > 0) {
        const firstSeason = filteredSeasons[0].season_number;
        setSelectedSeason(firstSeason);
        const epData = await fetchTMDB(`/tv/${id}/season/${firstSeason}?language=ar-SA`);
        setEpisodes(epData?.episodes || []);
        setSelectedEpisode(1);
        setPlayerUrl(getEmbedUrl('tv', details, firstSeason, 1, 'vidsrc'));
      }
    } else {
      setPlayerUrl(getEmbedUrl(type, details, 0, 0, 'vidsrc'));
    }

    const trailer = (details.videos?.results || []).find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
    setTrailerKey(trailer ? trailer.key : null);
    setIsPlayerActive(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleServerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setServerProvider(val);
    setPlayerUrl(getEmbedUrl(selectedMedia.mediaType, selectedMedia, selectedSeason, selectedEpisode, val));
    showToast('🔄 تم تغيير السيرفر', 'success');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#070707] text-white font-sans overflow-x-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-[76px] left-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="bg-[#181818] border border-white/10 border-r-4 border-r-[#e50914] rounded-xl px-4 py-3 text-[13px] font-semibold shadow-lg">
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
            <iframe src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`} className="w-full h-full border-none" allowFullScreen title="Trailer Player" />
          </div>
        </div>
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/75 z-[1100]" onClick={() => setIsSidebarOpen(false)}>
          <aside className="fixed top-0 right-0 w-[280px] max-w-[80vw] h-screen bg-[#111] border-l border-white/10 z-[1200] p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
              <span className="font-bold">📁 التصنيفات</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-[#aaa] hover:text-white cursor-pointer bg-none border-none text-[22px]">✕</button>
            </div>
            {GENRES.map((g) => (
              <div
                key={g.id}
                onClick={() => {
                  setSelectedGenre(String(g.id));
                  setIsSidebarOpen(false);
                }}
                className={`py-3.5 px-4 rounded-xl text-[14px] cursor-pointer mb-2 transition-all ${selectedGenre === String(g.id) ? 'bg-[#e50914] text-white' : 'bg-[#181818] text-[#ddd] hover:bg-[#222]'}`}
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
            <button onClick={() => setIsSidebarOpen(true)} className="bg-transparent border border-white/10 text-white p-2.5 rounded-[10px] cursor-pointer hover:bg-white/5">☰</button>

            <a href="#" onClick={(e) => { e.preventDefault(); handleResetToHome(); }} className="flex items-center gap-1.5 text-[18px] font-black no-underline text-white">
              <span className="w-8 h-8 rounded-lg grid place-items-center bg-[#e50914] text-[14px]">▶</span>
              <span>movies<span className="text-[#e50914]">io</span></span>
            </a>

            <Link href="/" className="no-underline hidden sm:block">
              <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all">
                🏠 الرئيسية
              </button>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-3">
              <button onClick={handleResetToHome} className="text-[#aaa] hover:text-white bg-none border-none cursor-pointer text-xs font-bold">الرئيسية</button>
              <button onClick={() => setMediaType('movie')} className={`bg-none border-none cursor-pointer text-xs font-bold transition-all ${mediaType === 'movie' ? 'text-white border-b-2 border-[#e50914] pb-1' : 'text-[#aaa]'}`}>أفلام</button>
              <button onClick={() => setMediaType('tv')} className={`bg-none border-none cursor-pointer text-xs font-bold transition-all ${mediaType === 'tv' ? 'text-white border-b-2 border-[#e50914] pb-1' : 'text-[#aaa]'}`}>مسلسلات</button>
            </div>

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن فيلم أو مسلسل..."
              className="w-[140px] sm:w-[220px] h-[38px] px-3 border border-white/10 rounded-[10px] bg-[#111] text-white text-[13px] outline-none focus:border-[#e50914] transition-all"
            />
          </div>
        </div>
      </header>

      <main className="w-[min(1400px,calc(100%-24px))] mx-auto py-4">
        {/* Hero */}
        <section className="relative pt-3 pb-2 mb-2">
          <h1 className="text-[26px] sm:text-[36px] font-black mb-1">عالم السينما <span className="text-[#e50914]">بدون حدود</span></h1>
          <p className="text-[#bbb] text-[13px] sm:text-[15px]">شاهد مسلسلاتك من حيث توقفت، مع تشغيل تلقائي للحلقات، بأقوى سيرفرات عالمية وبدون تقطيع.</p>
        </section>

        {/* Filters */}
        <div className="bg-[#181818] border border-white/10 rounded-xl p-3 my-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px] outline-none">
            <option value="movie">🎬 أفلام</option>
            <option value="tv">📺 مسلسلات</option>
          </select>
          <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px] outline-none">
            <option value="">جميع التصنيفات</option>
            {GENRES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px] outline-none">
            <option value="">جميع السنوات</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="classic">كلاسيكيات (&lt;1990)</option>
          </select>
          <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value)} className="p-2 bg-[#111] text-white rounded-lg border border-white/10 text-[13px] outline-none">
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
                  src={selectedMedia.poster_path ? `${IMAGE_BASE}${selectedMedia.poster_path}` : PLACEHOLDER_IMAGE}
                  alt={selectedMedia.title || selectedMedia.name}
                  className="w-[110px] h-[165px] sm:w-[140px] sm:h-[210px] object-cover rounded-[10px] shrink-0"
                />
                <div className="flex-1">
                  <h2 className="text-[20px] sm:text-[24px] mb-1.5 font-black">{selectedMedia.title || selectedMedia.name}</h2>
                  <p className="text-[#bbb] text-[12px] sm:text-[13px] leading-relaxed mb-3 line-clamp-4">{selectedMedia.overview || 'لا يوجد وصف متوفر.'}</p>
                  <button
                    onClick={() => { setIsPlayerActive(false); setPlayerUrl(''); }}
                    className="bg-[#333] hover:bg-[#444] text-white px-3 py-1.5 rounded-md cursor-pointer border-none text-xs transition-all"
                  >
                    إغلاق المشغل
                  </button>
                </div>
              </div>

              {selectedMedia.mediaType === 'tv' && (
                <div className="mt-2.5 border-t md:border-t-0 md:border-r border-white/10 pt-2.5 md:pt-0 md:pr-4 w-full">
                  <div className="flex gap-2 mb-2 flex-wrap items-center">
                    <span className="text-xs font-bold text-[#888]">الموسم:</span>
                    <select
                      value={selectedSeason}
                      onChange={(e) => loadEpisodes(selectedMedia.id, Number(e.target.value))}
                      className="py-1.5 px-2.5 bg-[#111] text-white rounded-lg text-[13px] border border-white/10 outline-none"
                    >
                      {seasons.map((s: any) => (
                        <option key={s.season_number} value={s.season_number}>الموسم {s.season_number}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1.5 flex-nowrap overflow-x-auto pb-2">
                    {episodes.map((ep: any) => (
                      <button
                        key={ep.episode_number}
                        onClick={() => {
                          setSelectedEpisode(ep.episode_number);
                          setPlayerUrl(getEmbedUrl('tv', selectedMedia, selectedSeason, ep.episode_number, serverProvider));
                        }}
                        className={`py-1.5 px-3 rounded-md cursor-pointer border-none text-xs whitespace-nowrap shrink-0 transition-all ${
                          selectedEpisode === ep.episode_number ? 'bg-[#e50914] text-white font-bold' : 'bg-[#222] text-[#ccc] hover:bg-[#333]'
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
              <div className="py-2.5 px-3 bg-[#111] flex justify-between items-center border-b border-white/5">
                <span className="text-xs font-extrabold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                  مشغل moviesio Pro
                </span>
                <select value={serverProvider} onChange={handleServerChange} className="py-1 px-2.5 bg-[#222] text-white rounded-md border-none text-xs outline-none cursor-pointer">
                  <option value="vidsrc">🚀 سيرفر 1 (VidSrc)</option>
                  <option value="multiembed">⚡ سيرفر 2 (MultiEmbed)</option>
                  <option value="2embed">🎬 سيرفر 3 (2Embed)</option>
                  <option value="smashy">📡 سيرفر 4 (SmashyStream)</option>
                  <option value="moviesapi">🎞️ سيرفر 5 (MoviesAPI)</option>
                  <option value="vidlink">🔥 سيرفر 6 (VidLink)</option>
                </select>
              </div>
              <div className="relative w-full aspect-video">
                <iframe src={playerUrl} className="absolute inset-0 w-full h-full border-0" allowFullScreen title="Content Player" />
              </div>
            </div>
          </div>
        )}

        {/* Grid Results */}
        {loading ? (
          <div className="text-center py-20 text-[#aaa] text-[14px] flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
            <span>جاري تحميل المحتوى...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {movies.map((item) => {
              const type = item.media_type || mediaType;
              const title = item.title || item.name || 'بدون عنوان';
              const poster = item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : PLACEHOLDER_IMAGE;

              return (
                <div
                  key={item.id}
                  onClick={() => openMedia(item.id, type)}
                  className="group rounded-[10px] bg-[#121212] border border-white/5 cursor-pointer overflow-hidden flex flex-col hover:border-white/20 hover:scale-[1.02] transition-all duration-200 shadow-md"
                >
                  <div className="aspect-[2/3] overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={poster} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="w-10 h-10 rounded-full bg-[#e50914] flex items-center justify-center text-white font-bold shadow-lg">▶</span>
                    </div>
                  </div>
                  <div className="p-2 flex-1 flex flex-col justify-between">
                    <h3 className="text-xs whitespace-nowrap overflow-hidden text-ellipsis font-bold text-gray-200 group-hover:text-white">{title}</h3>
                    <div className="flex justify-between items-center mt-1.5 text-[10px] text-[#888]">
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">{type === 'tv' ? 'مسلسل' : 'فيلم'}</span>
                      <span className="text-[#ffd700] font-bold">★ {Number(item.vote_average || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
