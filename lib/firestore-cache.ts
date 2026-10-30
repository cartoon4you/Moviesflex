import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Sanitize cache key into a valid Firestore Document ID
 */
function sanitizeDocId(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 500);
}

export interface FirestoreCacheMeta<T> {
  data: T;
  isStale: boolean;
  expiresAt: number;
}

/**
 * Get cached item from Firestore with TTL check and Stale-While-Revalidate support
 */
export async function getFirestoreCache<T>(
  key: string,
  options?: { allowStale?: boolean }
): Promise<T | null> {
  const result = await getFirestoreCacheWithMeta<T>(key);
  if (!result) return null;
  if (result.isStale && !options?.allowStale) return null;
  return result.data;
}

/**
 * Get cached item along with its freshness metadata for Stale-While-Revalidate
 */
export async function getFirestoreCacheWithMeta<T>(key: string): Promise<FirestoreCacheMeta<T> | null> {
  try {
    const docId = sanitizeDocId(key);
    const docRef = doc(db, 'media_cache', docId);

    // Bound Firestore cache wait to 400ms so a cold cache cannot stall navigation
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 400));
    
    const readPromise = (async (): Promise<FirestoreCacheMeta<T> | null> => {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const docData = snap.data();
      if (!docData || !docData.expiresAt || typeof docData.expiresAt !== 'number') return null;

      const now = Date.now();
      const staleUntil = typeof docData.staleUntil === 'number' ? docData.staleUntil : docData.expiresAt * 2;
      
      // If beyond the hard stale limit (e.g. expired beyond grace period), discard
      if (now > staleUntil && now > docData.expiresAt) {
        return null;
      }

      if (docData.data) {
        const parsed = JSON.parse(docData.data) as T;
        const isStale = now > docData.expiresAt;
        return {
          data: parsed,
          isStale,
          expiresAt: docData.expiresAt,
        };
      }
      return null;
    })().catch((err) => {
      console.warn(`[Firestore Cache Read Error] Key: ${key}`, err);
      return null;
    });

    return await Promise.race([readPromise, timeoutPromise]);
  } catch (err) {
    console.warn(`[Firestore Cache Read Warning] Key: ${key}`, err);
    return null;
  }
}

/**
 * Save item to Firestore persistent cache with extended TTL and Stale-While-Revalidate window
 */
export async function setFirestoreCache<T>(
  key: string,
  data: T,
  ttlMs: number,
  staleWindowMs?: number
): Promise<void> {
  try {
    const docId = sanitizeDocId(key);
    const docRef = doc(db, 'media_cache', docId);

    const expiresAt = Date.now() + ttlMs;
    // Default stale window is 3x the fresh TTL or at least 48 hours for long-term fast retrieval
    const staleUntil = Date.now() + (staleWindowMs ?? Math.max(ttlMs * 3, 48 * 60 * 60 * 1000));
    const jsonStr = JSON.stringify(data);

    // Non-blocking setDoc
    setDoc(docRef, {
      key,
      data: jsonStr,
      expiresAt,
      staleUntil,
      updatedAt: new Date().toISOString(),
    }).catch((err) => {
      console.warn(`[Firestore Cache Write Background Warning] Key: ${key}`, err);
    });
  } catch (err) {
    console.warn(`[Firestore Cache Write Error] Key: ${key}`, err);
  }
}
