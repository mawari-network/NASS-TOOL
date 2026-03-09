'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useMemo } from 'react';
import { type Address } from 'viem';
import { useNetworkCheck } from './use-network-check';
import { CONTRACT, License1155ABI } from '@/lib/constant';

const TIER_IDS = [1n, 2n, 3n] as const;

export interface TierBalance {
  tier: number;
  total: bigint;
}

/**
 * Fetches license balances for the connected wallet.
 * Uses balanceOfBatch for wallet balance per tier (used for staking/delegation).
 */
export function useLicenseBalance() {
  const { address } = useAccount();
  const { isConnected: isCorrectNetwork } = useNetworkCheck();

  const { data: totalBalances, isLoading, refetch } = useReadContract({
    address: CONTRACT.LICENSE_1155 as Address,
    abi: License1155ABI,
    functionName: 'balanceOfBatch',
    args: address ? [[address, address, address], TIER_IDS] : undefined,
    query: {
      enabled: !!address && isCorrectNetwork,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
  });

  const balances = useMemo((): TierBalance[] => {
    const totals = totalBalances && Array.isArray(totalBalances)
      ? (totalBalances as readonly bigint[])
      : [0n, 0n, 0n];
    return [
      { tier: 1, total: totals[0] ?? 0n },
      { tier: 2, total: totals[1] ?? 0n },
      { tier: 3, total: totals[2] ?? 0n },
    ];
  }, [totalBalances]);

  const getBalanceForTier = (tier: number): TierBalance | undefined =>
    balances.find((b) => b.tier === tier);

  return {
    balances,
    getBalanceForTier,
    isLoading,
    refetch,
  };
}
