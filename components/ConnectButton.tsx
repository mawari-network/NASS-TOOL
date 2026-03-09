'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { hasProjectId } from '@/config/wagmi';
import { useToast } from '@/hooks/use-toast';

export function ConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-lg transition-colors"
        onClick={() => {
          if (!hasProjectId) {
            toast({
              title: 'WalletConnect not configured',
              description: 'Set NEXT_PUBLIC_PROJECT_ID (or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID / NEXT_PUBLIC_WC_PROJECT_ID) and restart the dev server.',
              variant: 'destructive',
            });
            return;
          }
          open();
        }}
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        className="px-4 py-2 bg-[#2D2438] hover:bg-[#3D3448] text-white text-sm font-medium rounded-lg border border-gray-600 transition-colors"
        onClick={() => {
          if (!hasProjectId) {
            toast({
              title: 'WalletConnect not configured',
              description: 'Set NEXT_PUBLIC_PROJECT_ID (or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID / NEXT_PUBLIC_WC_PROJECT_ID) and restart the dev server.',
              variant: 'destructive',
            });
            return;
          }
          open();
        }}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-lg transition-colors"
      onClick={() => {
        if (!hasProjectId) {
          toast({
            title: 'WalletConnect not configured',
            description: 'Set NEXT_PUBLIC_PROJECT_ID (or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID / NEXT_PUBLIC_WC_PROJECT_ID) and restart the dev server.',
            variant: 'destructive',
          });
          return;
        }
        open();
      }}
    >
      Connect Wallet
    </button>
  );
}
