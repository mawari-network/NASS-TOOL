'use client';

import { useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { mawariMainnet } from '@/config/mainnet';

export function useNetworkCheck() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    if (!isConnected) return;

    if (chainId !== mawariMainnet.id) {
      alert(`Please connect to ${mawariMainnet.name} (Chain ID: ${mawariMainnet.id}) to use this application.`);
    }
  }, [isConnected, chainId]);

  const isCorrectNetwork = () => {
    if (!isConnected) return false;
    return chainId === mawariMainnet.id;
  };

  return {
    isConnected: isCorrectNetwork(),
    expectedChainId: mawariMainnet.id,
    expectedChainName: mawariMainnet.name,
  };
}
