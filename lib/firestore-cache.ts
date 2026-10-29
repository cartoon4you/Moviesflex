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

/**
 * Get cached item from Firestore with TTL check
 */
export async function getFirestoreCache<T>(key: string): Promise<T | null> {
  try {
    const docId = sanitizeDocId(key);
    const docRef = doc(db, 'media_cache', docId);

    // Timeout read operation after 1.5s to keep response times ultra-fast
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    
    const readPromise = (async () => {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const data = snap.data();
      if (!data || !data.expiresAt || typeof data.expiresAt !== 'number') return null;

      if (Date.now() > data.expiresAt) {
        return null;
      }

      if (data.data) {
        return JSON.parse(data.data) as T;
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
 * Save item to Firestore persistent cache with TTL
 */
export async function setFirestoreCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  try {
    const docId = sanitizeDocId(key);
    const docRef = doc(db, 'media_cache', docId);

    const expiresAt = Date.now() + ttlMs;
    const jsonStr = JSON.stringify(data);

    // Non-blocking setDoc
    setDoc(docRef, {
      key,
      data: jsonStr,
      expiresAt,
      updatedAt: new Date().toISOString(),
    }).catch((err) => {
      console.warn(`[Firestore Cache Write Background Warning] Key: ${key}`, err);
    });
  } catch (err) {
    console.warn(`[Firestore Cache Write Error] Key: ${key}`, err);
  }
}
