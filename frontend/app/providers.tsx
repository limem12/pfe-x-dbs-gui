'use client';

import { useEffect, useRef } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/toast-provider';
import { LocaleProvider } from '@/lib/locale-context';
import { useStore } from '@/lib/store-api';

export function Providers({ children }: { children: React.ReactNode }) {
  const loadFromStorage = useStore((state) => state.loadFromStorage);
  const hasLoadedFromStorage = useRef(false);

  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      return;
    }

    hasLoadedFromStorage.current = true;
    void loadFromStorage();
  }, [loadFromStorage]);

  return (
    <ThemeProvider>
      <LocaleProvider>
        <ToastProvider />
        {children}
      </LocaleProvider>
    </ThemeProvider>
  );
}
