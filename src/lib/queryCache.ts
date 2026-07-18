import type { InfiniteData } from '@tanstack/react-query';
import type { NotesPageResponse } from '@/lib/notes';

const CACHE_KEY = 'wsh-notes-infinite-cache-v1';
const MAX_AGE_MS = 10 * 60_000;

export interface StoredNotesCache {
  updatedAt: number;
  queryKey: readonly unknown[];
  data: InfiniteData<NotesPageResponse, string | null>;
}

export function loadNotesCache(): StoredNotesCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredNotesCache;
    if (!parsed?.updatedAt || !parsed?.data) return null;
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveNotesCache(cache: StoredNotesCache): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage failures
  }
}

export function clearNotesCache(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore storage failures
  }
}
