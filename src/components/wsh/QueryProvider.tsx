'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { wshQueryClient } from '@/store/wshStore';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={wshQueryClient}>{children}</QueryClientProvider>;
}
