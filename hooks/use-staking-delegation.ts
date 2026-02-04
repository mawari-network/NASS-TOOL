'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Address } from 'viem';
import { usePublicClient, useWalletClient, useAccount, useReadContract } from 'wagmi';
import { CONTRACT, DelegationABI } from '@/lib/constant';
import { useNetworkCheck } from './use-network-check';
import { useCurrentEpoch } from './use-epoch-info';

// --- Types ---

interface BaseDelegationParams {
  tier: number;
  nodeAddress: Address;
  amount: bigint;
}

interface DelegationResult {
  txHash: Address; // Viem returns hashes as Address type usually (0x string) or string
  receipt?: any;
  fromEpoch?: number;
}

// --- Hook ---

export function useStakingDelegation() {
  const queryClient = useQueryClient();
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isConnected: isCorrectNetwork } = useNetworkCheck();
  const { currentEpoch } = useCurrentEpoch();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: nodeCap } = useReadContract({
    address: CONTRACT.DELEGATION as Address,
    abi: DelegationABI,
    functionName: 'NODE_CAP',
    query: {
      enabled: true,
      staleTime: 300_000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  /**
   * Optimized Cache Invalidation
   * Invalidate any query related to the Delegation Contract to force a UI refresh.
   */
  const refetchDelegationData = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        // Safe check: look for the contract address in the query key arguments
        const queryKey = query.queryKey as Array<any>;
        return queryKey.some(
          (item) => 
            typeof item === 'object' && 
            item !== null && 
            'address' in item && 
            (item as any).address === CONTRACT.DELEGATION
        );
      },
    });
  }, [queryClient]);

  /**
   * Capacity Check
   * Uses cached nodeCap from useReadContract; only fetches getNodeActiveCount.
   */
  const checkNodeCapacity = useCallback(async (nodeAddress: Address, additionalAmount: bigint): Promise<boolean> => {
    if (!publicClient) throw new Error('Public client not available');
    const cap = nodeCap as bigint | undefined;
    if (!cap) throw new Error('Node capacity is still loading. Please wait a moment.');

    try {
      const currentCount = await publicClient.readContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'getNodeActiveCount',
        args: [nodeAddress],
      }) as bigint;

      return (currentCount + additionalAmount) <= cap;
    } catch (err) {
      console.error('Capacity check failed:', err);
      throw new Error('Failed to verify node capacity. Please try again.');
    }
  }, [publicClient, nodeCap]);

  /**
   * Analytics Reporting (Fire-and-forget)
   */
  const reportToDashboard = useCallback((
    txHash: string,
    action: 'deposit' | 'delegate',
    tier: number,
    amount: bigint,
    nodeAddress?: Address,
    fromEpoch?: number
  ) => {
    if (!connectedAddress) return;

    const payload: Record<string, unknown> = {
      tx_hash: txHash,
      user_address: connectedAddress,
      tier,
      amount: amount.toString(),
      action,
    };

    if (nodeAddress) {
      payload.node_address = nodeAddress;
      if (fromEpoch !== undefined) payload.from_epoch = fromEpoch;
    }

    // Non-blocking fetch
    fetch('/api/dashboard/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.warn('Failed to report to dashboard:', err));
  }, [connectedAddress]);

  /**
   * Unified Transaction Handler
   * Handles Simulation -> Write -> Wait -> Report -> Invalidate
   */
  const handleTransaction = useCallback(async (
    fnName: 'depositAndDelegate' | 'delegate' | 'undelegate' | 'undelegateAndWithdraw',
    args: any[],
    params: BaseDelegationParams
  ): Promise<DelegationResult> => {
    if (!isCorrectNetwork) throw new Error('Please connect to the correct network');
    if (!publicClient || !connectedAddress) throw new Error('Wallet not connected');
    if (!walletClient) throw new Error('Wallet client not available');

    setIsLoading(true);
    setError(null);

    try {
      // 1. Capacity Check (only for delegating actions)
      if (fnName === 'depositAndDelegate' || fnName === 'delegate') {
        const hasCapacity = await checkNodeCapacity(params.nodeAddress, params.amount);
        if (!hasCapacity) throw new Error('Node capacity exceeded. Cannot delegate more licenses to this node.');
      }

      // 2. Simulate Transaction (Gas estimation & Error checking)
      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: fnName,
        args: args,
        account: connectedAddress,
      });

      // 3. Execute Transaction
      const txHash = await walletClient.writeContract(request);

      // 4. Wait for Receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // 5. Post-Transaction Logic
      const fromEpoch = currentEpoch !== undefined ? currentEpoch + 1 : undefined;

      // Only report specific actions to dashboard
      if (fnName === 'depositAndDelegate' || fnName === 'delegate') {
        reportToDashboard(txHash, 'delegate', params.tier, params.amount, params.nodeAddress, fromEpoch);
      }

      // 6. Refresh Data
      refetchDelegationData();

      return { txHash, receipt, fromEpoch };

    } catch (err: any) {
      console.error(`Error in ${fnName}:`, err);
      // Extract a cleaner error message if possible
      const message = err.shortMessage || err.message || `Failed to ${fnName}`;
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    isCorrectNetwork, 
    publicClient, 
    connectedAddress, 
    walletClient, 
    checkNodeCapacity, 
    currentEpoch, 
    reportToDashboard, 
    refetchDelegationData
  ]);

  // --- Exposed Action Wrappers ---

  const depositAndDelegate = useCallback((params: BaseDelegationParams) => {
    return handleTransaction(
      'depositAndDelegate', 
      [BigInt(params.tier), params.nodeAddress, params.amount], 
      params
    );
  }, [handleTransaction]);

  const delegate = useCallback((params: BaseDelegationParams) => {
    return handleTransaction(
      'delegate', 
      [BigInt(params.tier), params.nodeAddress, params.amount], 
      params
    );
  }, [handleTransaction]);

  const undelegate = useCallback((params: BaseDelegationParams) => {
    return handleTransaction(
      'undelegate', 
      [BigInt(params.tier), params.nodeAddress, params.amount], 
      params
    );
  }, [handleTransaction]);

  const undelegateAndWithdraw = useCallback((params: BaseDelegationParams) => {
    return handleTransaction(
      'undelegateAndWithdraw', 
      [BigInt(params.tier), params.nodeAddress, params.amount], 
      params
    );
  }, [handleTransaction]);

  return {
    depositAndDelegate,
    delegate,
    undelegate,
    undelegateAndWithdraw,
    refetch: refetchDelegationData,
    isLoading,
    error,
    currentEpoch,
    nodeCap: nodeCap as bigint | undefined,
    checkNodeCapacity,
  };
}