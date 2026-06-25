'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { mawariChain } from '@/config/chain';

/**
 * Prompts the wallet to switch to the configured Mawari chain when connected on another network.
 */
export function NetworkAutoSwitch() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const lastAttemptChainId = useRef<number | null>(null);

  useEffect(() => {
    if (!isConnected) {
      lastAttemptChainId.current = null;
      return;
    }

    if (chainId === mawariChain.id) {
      lastAttemptChainId.current = null;
      return;
    }

    if (isPending || lastAttemptChainId.current === chainId) return;

    lastAttemptChainId.current = chainId;
    switchChain(
      { chainId: mawariChain.id },
      {
        onError: () => {
          lastAttemptChainId.current = null;
        },
      },
    );
  }, [isConnected, chainId, switchChain, isPending]);

  return null;
}
