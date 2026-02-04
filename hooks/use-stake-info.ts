'use client';

import { Address } from 'viem';
import { useReadContract } from 'wagmi';
import { CONTRACT, DelegationABI } from '@/lib/constant';

interface UseStakeInfoParams {
  staker?: Address;
  tier?: number;
  enabled?: boolean;
}

/**
 * Hook to get all nodes a staker has delegated to for a specific tier
 */
export function useDelegatedNodes({ staker, tier, enabled = true }: UseStakeInfoParams) {
  const result = useReadContract({
    address: CONTRACT.DELEGATION as Address,
    abi: DelegationABI,
    functionName: 'getDelegatedNodes',
    args: staker && tier !== undefined ? [staker, BigInt(tier)] : undefined,
    query: {
      enabled: enabled && Boolean(staker && tier !== undefined),
      staleTime: 30_000,
      gcTime: 300_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: 1000,
    },
  });

  return {
    ...result,
    data: result.data as Address[] | undefined,
    delegatedNodes: result.data as Address[] | undefined,
  };
}

/**
 * Hook to get delegation details for a specific staker, tier, and node
 */
interface UseNodeDelegationParams extends UseStakeInfoParams {
  node?: Address;
  epoch?: number;
}

export function useNodeDelegation({ 
  staker, 
  tier, 
  node, 
  epoch,
  enabled = true 
}: UseNodeDelegationParams) {
  const result = useReadContract({
    address: CONTRACT.DELEGATION as Address,
    abi: DelegationABI,
    functionName: node && epoch !== undefined 
      ? 'getDelegatedAmount'
      : 'getNodeDelegation',
    args: node && epoch !== undefined && staker && tier !== undefined
      ? [staker, BigInt(tier), node, BigInt(epoch)]
      : staker && tier !== undefined && node
      ? [staker, BigInt(tier), node]
      : undefined,
    query: {
      enabled: enabled && Boolean(
        staker && tier !== undefined && node && 
        (epoch !== undefined || true) // getNodeDelegation doesn't need epoch
      ),
      staleTime: 30_000,
      gcTime: 300_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: 1000,
    },
  });

  return {
    ...result,
    data: result.data,
    delegation: result.data,
  };
}
