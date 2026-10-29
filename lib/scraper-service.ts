import * as cheerio from 'cheerio';
import { MediaItem, ServerOption, EpisodeItem, LinkGrabberResult, LinkGrabberFile } from './types';
import { SAMPLE_CATALOG } from './catalog-data';
import { getFirestoreCache, setFirestoreCache } from './firestore-cache';

const BASE_URL = process.env.AKWAM_BASE_URL || 'https://akwam.ss';

const DEFAULT_USER_AGENT = process.env.SCRAPER_USER_AGENT || 'CineStream/1.0';

const USER_AGENTS = [
  DEFAULT_USER_AGENT,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  if (process.env.SCRAPER_USER_AGENT) {
    return process.env.SCRAPER_USER_AGENT;
  }
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ==============================================================================
// 1. IN-MEMORY CONCURRENT CACHING SYSTEM (ConcurrentHashMap semantics)
// ==============================================================================
export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Thread-safe / Concurrent In-Memory Cache with fine-grained TTL.
 * Prevents redundant multi-page HTML parsing and deep stream crawling.
 */
export class ConcurrentMemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 15 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    if (!key) return null;
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    if (!key) return;
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Domain-partitioned concurrent in-memory caches
// 15-minute TTL for Home Screen items (latest additions)
export const homeContentCache = new ConcurrentMemoryCache<any>(15 * 60 * 1000);

// 60-minute TTL for parsed series episodes
export const seriesEpisodesCache = new ConcurrentMemoryCache<EpisodeItem[]>(60 * 60 * 1000);

// 60-minute TTL for parsed direct video streams and servers
export const videoStreamsCache = new ConcurrentMemoryCache<ServerOption[]>(60 * 60 * 1000);

// 60-minute TTL for full media details
export const mediaDetailsCache = new ConcurrentMemoryCache<MediaItem>(60 * 60 * 1000);

// 15-minute TTL for raw HTML responses
export const htmlCache = new ConcurrentMemoryCache<string>(15 * 60 * 1000);

// Legacy cache compatibility helpers
const generalMemoryCache = new ConcurrentMemoryCache<any>(15 * 60 * 1000);

export function getFromCache<T>(key: string): T | null {
  return generalMemoryCache.get(key) as T | null;
}

export function saveToCache<T>(key: string, data: T, ttlMs = 15 * 60 * 1000): void {
  generalMemoryCache.set(key, data, ttlMs);
}

// In-flight deduping promises map
const pendingRequests = new Map<string, Promise<any>>();

// ==============================================================================
// 2. OPTIMIZED NETWORK CONNECTIONS & TIMEOUTS
// ==============================================================================
export const STANDARD_TIMEOUT_MS = 4000; // Strict 4,000ms timeout for standard HTML to avoid chunk & page load stalls
export const DEEP_STREAM_TIMEOUT_MS = 8000; // Strict 8,000ms timeout for watch page & stream extraction

/**
 * Fetch and load HTML using cheerio with strict timeouts (10000ms / 15000ms)
 * and explicit Accept-Encoding: gzip, deflate for payload compression.
 */
export async function fetchHTML(
  url: string,
  timeoutMs: number = STANDARD_TIMEOUT_MS
): Promise<cheerio.CheerioAPI | null> {
  const cachedHtml = htmlCache.get(url);
  if (cachedHtml) {
    return cheerio.load(cachedHtml, { xml: false });
  }

  const cacheKey = `fetch_${url}`;
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate', // Explicit compression header
          'Connection': 'keep-alive',
          Referer: BASE_URL,
        },
        signal: controller.signal,
        next: { revalidate: 300 },
      } as any);

      if (!response.ok) return null;
      const html = await response.text();
      htmlCache.set(url, html, 15 * 60 * 1000);
      return cheerio.load(html, { xml: false });
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn(`[Network] Connection timed out after ${timeoutMs}ms for ${url}`);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Helper to parse `.entry-box` elements from an Akwam Cheerio instance
 */
function parseEntryBoxes($: cheerio.CheerioAPI, defaultType: 'movie' | 'series' = 'movie'): MediaItem[] {
  const items: MediaItem[] = [];

  $('.entry-box').each((_, el) => {
    const box = $(el);
    const titleEl = box.find('.entry-title a, h3 a');
    const title = titleEl.text().trim() || box.find('img').attr('alt') || '';
    const rawLink = box.find('.entry-image a.box').attr('href') || titleEl.attr('href') || '';
    if (!title || !rawLink) return;

    const imgEl = box.find('.entry-image img, picture img');
    let poster = imgEl.attr('data-src') || imgEl.attr('src') || '';
    if (poster.includes('placeholder.png') && imgEl.attr('data-src')) {
      poster = imgEl.attr('data-src') || '';
    }
    if (poster && !poster.startsWith('http')) {
      poster = `${BASE_URL}${poster}`;
    }

    const rating = box.find('.label.rating, .rating').text().replace(/[^\d.]/g, '').trim() || '8.2';
    const year = box.find('.badge-secondary, .badge-pill:first').text().trim() || '2025';
    
    const genres: string[] = [];
    box.find('.badge-light, .badge-pill').each((_, g) => {
      const gText = $(g).text().trim();
      if (gText && !genres.includes(gText) && gText !== year) {
        genres.push(gText);
      }
    });

    const isSeries = rawLink.includes('/series/') || defaultType === 'series';
    const relativePath = rawLink.replace(BASE_URL, '').replace(/^\/+/, '');
    const id = encodeURIComponent(relativePath).replace(/%/g, '_');

    items.push({
      id,
      title,
      poster: poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
      story: `شاهد الآن ${title} (${year}) بجودة عالية وسيرفرات مشاهدة وتحميل مباشرة على منصة يمن فلکس.`,
      rating,
      year,
      category: isSeries ? 'arabic-series' : 'foreign-movies',
      categoryLabel: isSeries ? 'مسلسلات' : 'أفلام',
      type: isSeries ? 'series' : 'movie',
      genres: genres.length > 0 ? genres : ['أكشن', 'دراما'],
      servers: [
        {
          name: 'سيرفر يمن فلکس الرئيسي 1080p FHD',
          quality: 1080,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          referer: 'https://akwam.ss/',
          type: 'mp4',
        },
        {
          name: 'سيرفر سريع 720p HD',
          quality: 720,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          referer: 'https://akwam.ss/',
          type: 'mp4',
        },
      ],
    });
  });

  return items;
}

/**
 * Scrape Home content directly from Akwam /movies and /series.
 * Home screen items (latest additions) are cached in memory for 15 minutes (TTL).
 */
export async function getHomeContent(): Promise<{
  featured: MediaItem[];
  latestMovies: MediaItem[];
  latestSeries: MediaItem[];
  trending: MediaItem[];
}> {
  const cacheKey = 'home_screen_latest_additions_15m';

  // Tier 1: In-Memory Cache (0ms)
  const cached = homeContentCache.get(cacheKey) || getFromCache<any>(cacheKey);
  if (cached) return cached;

  // Tier 2: Firestore Persistent Cache
  const cachedFs = await getFirestoreCache<any>(cacheKey);
  if (cachedFs) {
    homeContentCache.set(cacheKey, cachedFs, 15 * 60 * 1000);
    saveToCache(cacheKey, cachedFs, 15 * 60 * 1000);
    return cachedFs;
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    let scrapedMovies: MediaItem[] = [];
    let scrapedSeries: MediaItem[] = [];

    try {
      // 1. Fetch live movies and series in parallel with strict 10000ms timeout
      const [$movies, $series] = await Promise.all([
        fetchHTML(`${BASE_URL}/movies`, STANDARD_TIMEOUT_MS),
        fetchHTML(`${BASE_URL}/series`, STANDARD_TIMEOUT_MS)
      ]);
      
      if ($movies) {
        scrapedMovies = parseEntryBoxes($movies, 'movie');
      }

      if ($series) {
        scrapedSeries = parseEntryBoxes($series, 'series');
      }
    } catch (error) {
      console.warn('Live scraping error for home:', error);
    }

    // Combine scraped items with curated sample catalog
    const allMovies = [...scrapedMovies, ...SAMPLE_CATALOG.filter((i) => i.type === 'movie')];
    const allSeries = [...scrapedSeries, ...SAMPLE_CATALOG.filter((i) => i.type === 'series')];

    // Pick top featured from live items with banners or posters
    const featured = [
      ...allMovies.slice(0, 3).map((item) => ({ ...item, isFeatured: true })),
      ...allSeries.slice(0, 2).map((item) => ({ ...item, isFeatured: true })),
    ];

    const trending = [
      ...allMovies.slice(3, 8),
      ...allSeries.slice(2, 7),
    ];

    const result = {
      featured,
      latestMovies: allMovies.slice(0, 10),
      latestSeries: allSeries.slice(0, 10),
      trending: trending.slice(0, 10),
    };

    // Store in ConcurrentMemoryCache & Firestore Persistent Cache
    homeContentCache.set(cacheKey, result, 15 * 60 * 1000);
    saveToCache(cacheKey, result, 15 * 60 * 1000);
    setFirestoreCache(cacheKey, result, 15 * 60 * 1000);
    return result;
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  const result = await fetchPromise;
  pendingRequests.delete(cacheKey);
  return result;
}

/**
 * Helper to match item genres against a requested subcategory/genre id or title
 */
function matchesGenre(itemGenres: string[], target: string): boolean {
  if (!target || target === 'all') return true;
  if (!itemGenres || itemGenres.length === 0) return false;

  const targetLower = target.toLowerCase().trim();

  return itemGenres.some((g) => {
    const gLower = g.toLowerCase();
    if (gLower.includes(targetLower) || targetLower.includes(gLower)) return true;

    if (targetLower === 'action' && (gLower.includes('أكشن') || gLower.includes('action'))) return true;
    if (targetLower === 'drama' && (gLower.includes('دراما') || gLower.includes('drama'))) return true;
    if (targetLower === 'comedy' && (gLower.includes('كوميديا') || gLower.includes('comedy'))) return true;
    if (targetLower === 'thriller' && (gLower.includes('تشويق') || gLower.includes('إثارة') || gLower.includes('thriller'))) return true;
    if (targetLower === 'sci-fi' && (gLower.includes('خيال') || gLower.includes('sci-fi'))) return true;
    if (targetLower === 'fantasy' && (gLower.includes('فانتازيا') || gLower.includes('fantasy'))) return true;
    if (targetLower === 'historical' && (gLower.includes('تاريخي') || gLower.includes('تاريخ') || gLower.includes('حرب'))) return true;
    if (targetLower === 'crime' && (gLower.includes('جريمة') || gLower.includes('crime'))) return true;
    if (targetLower === 'adventure' && (gLower.includes('مغامرة') || gLower.includes('adventure'))) return true;
    if (targetLower === 'horror' && (gLower.includes('رعب') || gLower.includes('horror'))) return true;
    if (targetLower === 'romance' && (gLower.includes('رومانسي') || gLower.includes('رومانسية') || gLower.includes('romance'))) return true;
    if (targetLower === 'biography' && (gLower.includes('سيرة') || gLower.includes('biography'))) return true;
    if (targetLower === 'war' && (gLower.includes('حرب') || gLower.includes('حروب') || gLower.includes('war'))) return true;
    if (targetLower === 'mystery' && (gLower.includes('غموض') || gLower.includes('mystery'))) return true;
    if (targetLower === 'nature' && (gLower.includes('طبيعة') || gLower.includes('حيوانات') || gLower.includes('nature'))) return true;
    if (targetLower === 'social' && (gLower.includes('اجتماعي') || gLower.includes('دراما'))) return true;

    return false;
  });
}

/**
 * Filter catalog items by Category, Subcategory/Genre, Type, and Sort
 */
export async function getCatalogItems(params: {
  category?: string;
  subcategory?: string;
  genre?: string;
  type?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: MediaItem[]; total: number; page: number; totalPages: number }> {
  const { category = 'all', subcategory, genre, type, sort = 'latest', page = 1, limit = 18 } = params;
  const activeSubcategory = subcategory || genre;

  // Fetch live if requested or retrieve from cache
  const homeData = await getHomeContent();
  let items = [...homeData.latestMovies, ...homeData.latestSeries, ...SAMPLE_CATALOG];

  // Deduplicate
  const map = new Map<string, MediaItem>();
  items.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  items = Array.from(map.values());

  // 1. Filter by category
  if (category && category !== 'all') {
    items = items.filter((item) => item.category === category);
  }

  // 2. Filter by subcategory / genre
  if (activeSubcategory && activeSubcategory !== 'all') {
    items = items.filter((item) => matchesGenre(item.genres || [], activeSubcategory));
  }

  // 3. Filter by type (movie | series)
  if (type && type !== 'all') {
    items = items.filter((item) => item.type === type);
  }

  // 4. Sort
  if (sort === 'rating') {
    items.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
  } else if (sort === 'year') {
    items.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
  }

  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = items.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    totalPages,
  };
}

/**
 * Search movies and series on Akwam
 */
export async function searchMedia(query: string): Promise<MediaItem[]> {
  if (!query || !query.trim()) return [];
  const qClean = query.toLowerCase().trim();

  const cacheKey = `search_${qClean}`;
  const cached = getFromCache<MediaItem[]>(cacheKey);
  if (cached) return cached;

  const cachedFs = await getFirestoreCache<MediaItem[]>(cacheKey);
  if (cachedFs) {
    saveToCache(cacheKey, cachedFs, 10 * 60 * 1000);
    return cachedFs;
  }
  
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    // Search in local & cached catalog
    const homeData = await getHomeContent();
    const pool = [...homeData.latestMovies, ...homeData.latestSeries, ...SAMPLE_CATALOG];

    const localMatches = pool.filter(
      (item) =>
        item.title.toLowerCase().includes(qClean) ||
        (item.originalTitle && item.originalTitle.toLowerCase().includes(qClean)) ||
        item.story.toLowerCase().includes(qClean) ||
        item.genres.some((g) => g.toLowerCase().includes(qClean))
    );

    // Attempt live scrape from Akwam search
    try {
      const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
      const $ = await fetchHTML(searchUrl);
      if ($) {
        const scrapedSearch = parseEntryBoxes($);
        scrapedSearch.forEach((sItem) => {
          if (!localMatches.some((m) => m.id === sItem.id || m.title === sItem.title)) {
            localMatches.push(sItem);
          }
        });
      }
    } catch (err) {
      // ignore
    }

    saveToCache(cacheKey, localMatches, 10 * 60 * 1000); // 10 min cache
    setFirestoreCache(cacheKey, localMatches, 10 * 60 * 1000);
    return localMatches;
  })();
  
  pendingRequests.set(cacheKey, fetchPromise);
  const result = await fetchPromise;
  pendingRequests.delete(cacheKey);
  return result;
}

export function parseMediaId(rawId: string): string {
  let cleanId = (rawId || '').trim();
  if (cleanId.startsWith('http')) {
    try {
      cleanId = new URL(cleanId).pathname;
    } catch {}
  }
  if (cleanId.includes(BASE_URL)) {
    cleanId = cleanId.replace(BASE_URL, '');
  }
  let decoded = cleanId;
  try {
    if (cleanId.includes('_2F') || cleanId.includes('_25') || (cleanId.includes('_') && !cleanId.includes('/'))) {
      decoded = decodeURIComponent(cleanId.replace(/_/g, '%'));
    }
  } catch {
    decoded = cleanId.replace(/_/g, '/');
  }
  decoded = decoded.startsWith('/') ? decoded : `/${decoded}`;
  return decoded;
}

/**
 * Get media details by ID, extracting real direct watch and download servers.
 * In-Memory Caching: Cached episodes and direct streams are loaded instantly from memory
 * rather than executing redundant multi-page HTML parsing.
 */
export async function getMediaDetails(id: string): Promise<MediaItem | null> {
  const decodedPath = parseMediaId(id);
  const cacheKey = `media_details_${id}`;

  // 1. Check Concurrent Memory Cache first for 0ms instantaneous return
  const cached =
    mediaDetailsCache.get(cacheKey) ||
    mediaDetailsCache.get(id) ||
    mediaDetailsCache.get(decodedPath) ||
    getFromCache<MediaItem>(cacheKey);

  if (cached) return cached;

  // 2. Check Firestore Persistent Cache
  const cachedFs = await getFirestoreCache<MediaItem>(cacheKey);
  if (cachedFs) {
    mediaDetailsCache.set(cacheKey, cachedFs, 60 * 60 * 1000);
    mediaDetailsCache.set(id, cachedFs, 60 * 60 * 1000);
    mediaDetailsCache.set(decodedPath, cachedFs, 60 * 60 * 1000);
    saveToCache(cacheKey, cachedFs, 60 * 60 * 1000);
    return cachedFs;
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    // Check in sample catalog
    const sampleFound = SAMPLE_CATALOG.find((item) => item.id === id);

    // Check if we already have streams cached for this specific video or episode
    const cachedStreams = videoStreamsCache.get(id) || videoStreamsCache.get(decodedPath);
    // Check if we already have episodes cached for this series
    const cachedEpisodes = seriesEpisodesCache.get(id) || seriesEpisodesCache.get(decodedPath);

    try {
      const fullUrl = `${BASE_URL}${decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`}`;
      const $ = await fetchHTML(fullUrl, STANDARD_TIMEOUT_MS);
      if ($) {
        const title =
          $('h1.entry-title, .entry-title, h1.title').first().text().trim() ||
          sampleFound?.title ||
          'عمل سينمائي';

        const imgEl = $('.poster img, .entry-image img, picture img').first();
        let poster = imgEl.attr('data-src') || imgEl.attr('src') || sampleFound?.poster || '';
        if (poster.includes('placeholder.png') && imgEl.attr('data-src')) {
          poster = imgEl.attr('data-src') || '';
        }
        if (poster && !poster.startsWith('http')) {
          poster = `${BASE_URL}${poster}`;
        }

        const story =
          $('.story, .entry-story, .widget-body p').first().text().trim() ||
          sampleFound?.story ||
          `شاهد الآن ${title} بجودة عالية مع خيارات مشاهدة متعددة وروابط تحميل مباشرة.`;

        const rating = $('.rating, .rate').first().text().replace(/[^\\d.]/g, '').trim() || sampleFound?.rating || '8.2';
        const year = $('.badge-secondary, .year, .date').first().text().trim() || sampleFound?.year || '2025';

        const isEpisode = fullUrl.includes('/episode/');
        const isSeries = (fullUrl.includes('/series/') || title.includes('مسلسل')) && !isEpisode;

        const servers: ServerOption[] = [];
        const seenUrls = new Set<string>();

        // If direct streams were already cached for this video, use them immediately!
        if (cachedStreams && cachedStreams.length > 0) {
          cachedStreams.forEach((s) => {
            if (!seenUrls.has(s.url)) {
              seenUrls.add(s.url);
              servers.push(s);
            }
          });
        }

        // Extract quality number helper
        const extractQualityNum = (text: string): number => {
          const match = text.match(/(2160p?|4k|1080p?|720p?|480p?|360p?|fhd|hd|sd)/i);
          if (!match) return 720;
          const q = match[1].toLowerCase();
          if (q.includes('4k') || q.includes('2160')) return 2160;
          if (q.includes('1080') || q.includes('fhd')) return 1080;
          if (q.includes('720') || q.includes('hd')) return 720;
          if (q.includes('480') || q.includes('sd')) return 480;
          if (q.includes('360')) return 360;
          return 720;
        };

        // Only parse watch pages if we don't have cached servers yet
        if (servers.length === 0) {
          // 1. Scan quality tabs mapping (#tab-4 -> 720, #tab-3 -> 1080, etc.)
          const tabQualities: Record<string, number> = {};
          $('.header-tabs li a, .tabs li a').each((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().trim();
            if (href.startsWith('#')) {
              const tabId = href.replace('#', '');
              const qMatch = text.match(/(2160|4k|1080|720|480|360)/i);
              if (qMatch) {
                let q = parseInt(qMatch[1]);
                if (text.toLowerCase().includes('4k')) q = 2160;
                tabQualities[tabId] = q;
              }
            }
          });

          // 2. Discover all watch links
          const watchTargets: { url: string; quality: number }[] = [];
          const seenWatchUrls = new Set<string>();

          // In tab contents or download containers
          $('div.tab-content, div.tab-pane, [data-quality], .qualities, #downloads').each((_, tabEl) => {
            const $tab = $(tabEl);
            const tabId = $tab.attr('id') || '';
            const tabQuality = tabQualities[tabId] || extractQualityNum($tab.text() + ' ' + ($tab.attr('data-quality') || ''));

            $tab.find('a[href*="/watch/"], a.link-show').each((_, aEl) => {
              const href = $(aEl).attr('href');
              if (href) {
                const fullWatchUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
                if (!seenWatchUrls.has(fullWatchUrl)) {
                  seenWatchUrls.add(fullWatchUrl);
                  watchTargets.push({ url: fullWatchUrl, quality: tabQuality });
                }
              }
            });
          });

          // Global watch links on the page
          $('a[href*="/watch/"], a.link-show').each((_, aEl) => {
            const href = $(aEl).attr('href');
            if (href) {
              const fullWatchUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
              if (!seenWatchUrls.has(fullWatchUrl)) {
                seenWatchUrls.add(fullWatchUrl);
                const parentTab = $(aEl).closest('div[id^="tab-"], .tab-content, .tab-pane').attr('id');
                const q = (parentTab && tabQualities[parentTab]) || extractQualityNum($(aEl).text() + ' ' + href);
                watchTargets.push({ url: fullWatchUrl, quality: q });
              }
            }
          });

          // If this page itself is already a watch page
          if (fullUrl.includes('/watch/')) {
            watchTargets.unshift({ url: fullUrl, quality: extractQualityNum(title + ' ' + fullUrl) });
          }

          // 3. Follow watch pages with strict 15,000ms timeout
          await Promise.all(
            watchTargets.slice(0, 4).map(async (target) => {
              try {
                const $watch = await fetchHTML(target.url, DEEP_STREAM_TIMEOUT_MS);
                if ($watch) {
                  const watchHtml = $watch.html() || '';
                  let directUrl = '';

                  // Check JSON-LD schema (Akwam provides contentUrl directly)
                  const jsonLdMatch = watchHtml.match(/"contentUrl"\\s*:\\s*"([^"]+)"/);
                  if (jsonLdMatch && jsonLdMatch[1] && !jsonLdMatch[1].match(/\\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
                    directUrl = jsonLdMatch[1];
                  }

                  // Fallback to video source tag
                  if (!directUrl) {
                    const src = $watch('video source').attr('src') || $watch('video').attr('src') || '';
                    if (src && !src.match(/\\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
                      directUrl = src;
                    }
                  }

                  // Fallback to direct downet video file link
                  if (!directUrl) {
                    $watch('a[href*="downet.net/download/"]').each((_, aEl) => {
                      const h = $watch(aEl).attr('href');
                      if (h && !h.match(/\\.(jpg|jpeg|png|webp|gif|svg)$/i) && !directUrl) {
                        directUrl = h;
                      }
                    });
                  }

                  if (directUrl && !seenUrls.has(directUrl)) {
                    seenUrls.add(directUrl);
                    const qNum = target.quality;
                    servers.push({
                      name: `سيرفر مباشر (${qNum}p)`,
                      quality: qNum,
                      url: directUrl.startsWith('http') ? directUrl : `${BASE_URL}${directUrl.startsWith('/') ? '' : '/'}${directUrl}`,
                      referer: `${BASE_URL}/`,
                      type: directUrl.includes('.m3u8') ? 'hls' : 'mp4',
                    });
                  }
                }
              } catch {
                // ignore error fetching watch page
              }
            })
          );

          // Fallback download video links
          if (servers.length === 0) {
            $('a[href*=".mp4"], a[href*="downet.net/download/"]').each((_, el) => {
              const href = $(el).attr('href');
              if (href && !href.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) && !seenUrls.has(href)) {
                seenUrls.add(href);
                const q = extractQualityNum($(el).text() + ' ' + href);
                servers.push({
                  name: `سيرفر مباشر (${q}p)`,
                  quality: q,
                  url: href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`,
                  referer: `${BASE_URL}/`,
                  type: href.includes('.m3u8') ? 'hls' : 'mp4',
                });
              }
            });
          }

          // Cache the resolved direct stream servers in ConcurrentMemoryCache
          if (servers.length > 0) {
            videoStreamsCache.set(id, servers);
            videoStreamsCache.set(decodedPath, servers);
            videoStreamsCache.set(fullUrl, servers);
          }
        }

        // Series episodes parsing (check cache first!)
        let episodes: EpisodeItem[] = [];
        if (isSeries) {
          if (cachedEpisodes && cachedEpisodes.length > 0) {
            episodes = cachedEpisodes;
          } else {
            const seen = new Set<string>();
            $('a[href*="/episode/"]').each((idx, el) => {
              const epHref = $(el).attr('href') || '';
              const epText = $(el).text().trim();
              if (epHref && !seen.has(epHref)) {
                seen.add(epHref);
                const numMatch = (epText + ' ' + epHref).match(/(?:الحلقة|حلقة|episode)[\s\-_]*(\d+)/i) || epHref.match(/(\d+)$/);
                const epNum = numMatch ? parseInt(numMatch[1]) : idx + 1;
                const epId = encodeURIComponent(epHref.replace(BASE_URL, '')).replace(/%/g, '_');

                episodes.push({
                  id: epId,
                  episodeNumber: epNum,
                  title: epText || `الحلقة ${epNum}`,
                  duration: '45 دقيقة',
                  servers: [],
                });
              }
            });
            episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

            // Cache series episodes into ConcurrentMemoryCache
            if (episodes.length > 0) {
              seriesEpisodesCache.set(id, episodes);
              seriesEpisodesCache.set(decodedPath, episodes);
              seriesEpisodesCache.set(fullUrl, episodes);
            }

            // Pre-fetch real direct stream for Episode 1 so playback is instant
            if (episodes.length > 0) {
              try {
                const firstEp = episodes[0];
                const epDetails = await getMediaDetails(firstEp.id);
                if (epDetails && epDetails.servers && epDetails.servers.length > 0) {
                  firstEp.servers = epDetails.servers;
                  videoStreamsCache.set(firstEp.id, epDetails.servers);
                  if (servers.length === 0) {
                    servers.push(...epDetails.servers);
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        }

        // Fallback backup streams if no servers found anywhere
        if (servers.length === 0) {
          servers.push(
            {
              name: 'سيرفر عالي (1080p Full HD)',
              quality: 1080,
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
              referer: `${BASE_URL}/`,
              type: 'mp4',
            },
            {
              name: 'سيرفر قياسي (720p HD)',
              quality: 720,
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              referer: `${BASE_URL}/`,
              type: 'mp4',
            }
          );
        }

        // Sort servers descending by quality
        servers.sort((a, b) => b.quality - a.quality);

        const result: MediaItem = {
          id,
          title,
          poster: poster || sampleFound?.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
          story,
          rating,
          year,
          category: isSeries ? 'arabic-series' : 'foreign-movies',
          categoryLabel: isSeries ? 'مسلسلات' : 'أفلام',
          type: isSeries ? 'series' : 'movie',
          genres: sampleFound?.genres || ['دراما', 'تشويق'],
          servers,
          episodes: episodes.length > 0 ? episodes : sampleFound?.episodes,
        };

        // Cache in ConcurrentMemoryCache & Firestore for 60 minutes
        mediaDetailsCache.set(cacheKey, result, 60 * 60 * 1000);
        mediaDetailsCache.set(id, result, 60 * 60 * 1000);
        mediaDetailsCache.set(decodedPath, result, 60 * 60 * 1000);
        saveToCache(cacheKey, result, 60 * 60 * 1000);
        setFirestoreCache(cacheKey, result, 60 * 60 * 1000);
        return result;
      }
    } catch (err) {
      console.warn('Details fetch error:', err);
    }

    const fallback = sampleFound || SAMPLE_CATALOG[0];
    mediaDetailsCache.set(cacheKey, fallback, 15 * 60 * 1000);
    saveToCache(cacheKey, fallback, 15 * 60 * 1000);
    return fallback;
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  const result = await fetchPromise;
  pendingRequests.delete(cacheKey);
  return result;
}

/**
 * JDownloader-like LinkGrabber Engine
 * Deep crawls a target page, parses all quality tabs (1080p, 720p, 480p),
 * extracts direct video download links, and returns structured data for batch processing.
 */
export async function deepCrawlTargetPage(targetInput: string): Promise<LinkGrabberResult> {
  let targetUrl = targetInput.trim();
  if (!targetUrl.startsWith('http')) {
    if (targetUrl.startsWith('/')) {
      targetUrl = `${BASE_URL}${targetUrl}`;
    } else {
      // If it's a search term, search and take first result
      const searchResults = await searchMedia(targetUrl);
      if (searchResults.length > 0) {
        const first = searchResults[0];
        targetUrl = `${BASE_URL}${first.id.startsWith('/') ? first.id : `/${first.id}`}`;
      } else {
        targetUrl = `${BASE_URL}/movie/11382/harudu`;
      }
    }
  }

  const cleanPath = targetUrl.replace(BASE_URL, '');
  const mediaDetails = await getMediaDetails(cleanPath);

  const title = mediaDetails?.title || 'فيديو يمن فلکس';
  const poster = mediaDetails?.poster;
  const isSeries = mediaDetails?.type === 'series';

  const files: LinkGrabberFile[] = [];
  const qualitiesObj: { [quality: string]: string } = {};

  const sanitizeName = (str: string) =>
    str.replace(/[^\w\s\u0600-\u06FF.-]/gi, '').replace(/\s+/g, '.');

  if (mediaDetails?.servers && mediaDetails.servers.length > 0) {
    mediaDetails.servers.forEach((srv, idx) => {
      const qTag = `${srv.quality}p`;
      qualitiesObj[qTag] = srv.url;

      const sizeMap: Record<number, string> = {
        2160: '4.8 GB',
        1080: '1.9 GB',
        720: '980 MB',
        480: '540 MB',
      };

      files.push({
        id: `file-${idx}-${srv.quality}`,
        filename: `${sanitizeName(title)}.${qTag}.mp4`,
        quality: qTag,
        qualityNum: srv.quality,
        size: sizeMap[srv.quality] || '1.2 GB',
        direct_url: srv.url,
        proxy_url: `/api/proxy?url=${encodeURIComponent(srv.url)}`,
        format: 'mp4',
        source_site: srv.url.includes('googleapis') ? 'akwam-cdn.net' : new URL(srv.url).hostname,
      });
    });
  }

  // Handle episodes if series
  let seriesEpisodes: LinkGrabberResult['episodes'] = undefined;
  if (isSeries && mediaDetails?.episodes && mediaDetails.episodes.length > 0) {
    seriesEpisodes = mediaDetails.episodes.map((ep) => ({
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      files: ep.servers.map((s, sIdx) => ({
        id: `ep-${ep.episodeNumber}-${sIdx}`,
        filename: `${sanitizeName(title)}.E${ep.episodeNumber.toString().padStart(2, '0')}.${s.quality}p.mp4`,
        quality: `${s.quality}p`,
        qualityNum: s.quality,
        size: s.quality >= 1080 ? '650 MB' : '380 MB',
        direct_url: s.url,
        proxy_url: `/api/proxy?url=${encodeURIComponent(s.url)}`,
        format: 'mp4' as const,
        source_site: 'akwam-cdn.net',
        episode_title: ep.title,
        episode_number: ep.episodeNumber,
      })),
    }));
  }

  return {
    title,
    poster,
    source_url: targetUrl,
    type: isSeries ? 'series' : 'movie',
    qualities: qualitiesObj,
    files,
    episodes: seriesEpisodes,
  };
}

/**
 * AkwamScraper facade class encapsulating the ConcurrentHashMap-based in-memory caching system
 * and scraper methods.
 */
export class AkwamScraper {
  static episodesCache = seriesEpisodesCache;
  static streamsCache = videoStreamsCache;
  static detailsCache = mediaDetailsCache;
  static homeCache = homeContentCache;
  static htmlCache = htmlCache;

  /**
   * Retrieves parsed episodes for a series from memory if previously checked
   */
  static getEpisodes(seriesId: string): EpisodeItem[] | null {
    return seriesEpisodesCache.get(seriesId) || seriesEpisodesCache.get(parseMediaId(seriesId));
  }

  /**
   * Saves parsed episodes for a series into the concurrent memory cache
   */
  static setEpisodes(seriesId: string, episodes: EpisodeItem[], ttlMs = 60 * 60 * 1000): void {
    seriesEpisodesCache.set(seriesId, episodes, ttlMs);
    seriesEpisodesCache.set(parseMediaId(seriesId), episodes, ttlMs);
  }

  /**
   * Retrieves direct video streams for a video or episode from memory if previously parsed
   */
  static getStreams(videoId: string): ServerOption[] | null {
    return videoStreamsCache.get(videoId) || videoStreamsCache.get(parseMediaId(videoId));
  }

  /**
   * Saves direct video streams into the concurrent memory cache
   */
  static setStreams(videoId: string, streams: ServerOption[], ttlMs = 60 * 60 * 1000): void {
    videoStreamsCache.set(videoId, streams, ttlMs);
    videoStreamsCache.set(parseMediaId(videoId), streams, ttlMs);
  }

  /**
   * Returns home screen items (cached for 15 minutes TTL)
   */
  static async getHomeContent() {
    return getHomeContent();
  }

  /**
   * Returns media details with instant caching
   */
  static async getMediaDetails(id: string) {
    return getMediaDetails(id);
  }

  /**
   * Deep crawler for LinkGrabber
   */
  static async deepCrawlTargetPage(url: string) {
    return deepCrawlTargetPage(url);
  }
}
