'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import type { ReactNode } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { useState } from 'react';
import {
  wagmiAdapter,
  networks,
  projectId,
  metadata,
  featuredWalletIds,
} from '@/config/wagmi';
import { NetworkAutoSwitch } from '@/components/NetworkAutoSwitch';

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId: projectId || 'dummy',
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  includeWalletIds: featuredWalletIds.length > 0 ? featuredWalletIds : undefined,
});

function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnMount: true,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            gcTime: 1000 * 60 * 5,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <NetworkAutoSwitch />
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default Web3Provider;
