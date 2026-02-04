'use client';

import * as React from 'react';
import { Toaster } from '@/components/ui/toaster';
import Web3Provider from '@/providers/Web3Provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <Web3Provider>
      {mounted && children}
      <Toaster />
    </Web3Provider>
  );
}
