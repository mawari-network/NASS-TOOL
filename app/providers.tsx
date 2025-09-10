'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from "wagmi";
import { mawariTestnet, mawariMainnet } from '@/config/chains';
import { IS_TESTNET } from '@/lib/constant';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { Toaster } from '@/components/ui/toaster';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  chains: IS_TESTNET ? [mawariTestnet] : [mawariMainnet],
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID_HERE",
  appName: "NASS Tool",
  appDescription: "NASS License Management Tool",
  appUrl: "https://family.co",
  appIcon: "https://family.co/logo.png",
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {mounted && children}
          <Toaster />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}