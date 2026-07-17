'use client';

import { useMemo } from 'react';
import { useInfiniteNotes } from '@/hooks/useInfiniteNotes';
import { useWSHStore, type Note } from '@/store/wshStore';

export function useVisibleNotes(): {
  notes: Note[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
} {
  const storeNotes = useWSHStore((s) => s.notes);
  const query = useInfiniteNotes();

  const notes = useMemo(() => {
    const remoteNotes = query.data?.pages.flatMap((page) => page.notes) ?? [];
    return remoteNotes.length > 0 ? remoteNotes : storeNotes;
  }, [query.data, storeNotes]);

  return {
    notes,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => query.fetchNextPage(),
  };
}
