'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { mawariChain } from '@/config/chain';

export function useNetworkCheck() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { isPending: isSwitching } = useSwitchChain();

  const isCorrectNetwork = isConnected && chainId === mawariChain.id;

  return {
    /** @deprecated Use isCorrectNetwork — kept for existing call sites */
    isConnected: isCorrectNetwork,
    isCorrectNetwork,
    isSwitching,
    expectedChainId: mawariChain.id,
    expectedChainName: mawariChain.name,
  };
}
