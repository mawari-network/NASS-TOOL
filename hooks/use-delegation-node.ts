'use client';

import { useCallback } from 'react';
import { type Address } from 'viem';
import { usePublicClient } from 'wagmi';
import { CONTRACT, DelegationABI } from '@/lib/constant';

export function useDelegationNode() {
  const publicClient = usePublicClient();

  const getNodeTotalActiveCount = useCallback(
    async (node: Address): Promise<bigint> => {
      if (!publicClient) return 0n;
      return publicClient.readContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'getNodeActiveCount',
        args: [node],
      }) as Promise<bigint>;
    },
    [publicClient],
  );

  return { getNodeTotalActiveCount };
}
