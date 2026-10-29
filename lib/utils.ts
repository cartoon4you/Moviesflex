import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parses a JSON string, avoiding SyntaxError if HTML or malformed string is provided.
 */
export function safeJsonParse<T = any>(str: string | null | undefined, fallback: T): T {
  if (!str || typeof str !== 'string') return fallback;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return fallback;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely fetches JSON from an endpoint, verifying HTTP status and Content-Type
 * to avoid "Uncaught SyntaxError: Unexpected token '<'" when proxies return HTML.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      return { ok: false, data: null, error: `HTTP ${res.status}` };
    }
    if (!contentType.includes('application/json')) {
      return { ok: false, data: null, error: 'Non-JSON content type received' };
    }
    const text = await res.text();
    const data = safeJsonParse<T>(text, null as any);
    if (data === null) {
      return { ok: false, data: null, error: 'Malformed JSON payload' };
    }
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, data: null, error: err?.message || 'Network error' };
  }
}

