'use client';

import { Address } from 'viem';
import { useReadContract } from 'wagmi';
import { CONTRACT, DelegationABI } from '@/lib/constant';

/**
 * Hook to read current epoch from Delegation contract
 */
export function useCurrentEpoch(enabled = true) {
  const result = useReadContract({
    address: CONTRACT.DELEGATION as Address,
    abi: DelegationABI,
    functionName: 'currentEpoch',
    query: {
      enabled,
      staleTime: 60_000,
      gcTime: 600_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: 1000,
    },
  });

  return {
    ...result,
    data: result.data as number | undefined,
    currentEpoch: result.data as number | undefined,
  };
}
