'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Address, type Hex } from 'viem';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
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
  txHash: Address;
  receipt?: any;
  fromEpoch?: number;
}

export interface DepositAndOfferDelegationParams {
  to: Address;
  tier: number;
  amount: bigint;
}

export interface DepositAndOfferDelegationResult {
  txHash: Hex;
  offerHash: Hex;
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
   * Undelegate and withdraw (single action: undelegate from node and withdraw licenses to wallet).
   */
  const handleUndelegateAndWithdraw = useCallback(async (params: BaseDelegationParams): Promise<DelegationResult> => {
    if (!isCorrectNetwork) throw new Error('Please connect to the correct network');
    if (!publicClient || !connectedAddress) throw new Error('Wallet not connected');
    if (!walletClient) throw new Error('Wallet client not available');

    setIsLoading(true);
    setError(null);

    try {
      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'undelegateAndWithdraw',
        args: [BigInt(params.tier), params.nodeAddress, params.amount],
        account: connectedAddress,
      });

      const txHash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      refetchDelegationData();
      return { txHash, receipt };
    } catch (err: any) {
      console.error('Error in undelegateAndWithdraw:', err);
      const message = err.shortMessage || err.message || 'Undelegate and withdraw failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, publicClient, connectedAddress, walletClient, refetchDelegationData]);

  const undelegateAndWithdraw = useCallback((params: BaseDelegationParams) => {
    return handleUndelegateAndWithdraw(params);
  }, [handleUndelegateAndWithdraw]);

  /**
   * Create a delegation offer (deposit and offer to an address; they can accept later).
   * Returns offerHash from DelegationOfferCreated event for UI to track pending offers.
   */
  const depositAndOfferDelegation = useCallback(async (params: DepositAndOfferDelegationParams): Promise<DepositAndOfferDelegationResult> => {
    if (!isCorrectNetwork) throw new Error('Please connect to the correct network');
    if (!publicClient || !connectedAddress) throw new Error('Wallet not connected');
    if (!walletClient) throw new Error('Wallet client not available');

    setIsLoading(true);
    setError(null);

    try {
      const { request, result } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'depositAndOfferDelegation',
        args: [params.to, BigInt(params.tier), params.amount],
        account: connectedAddress,
      });

      const txHash = await walletClient.writeContract(request) as Hex;
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // `depositAndOfferDelegation` returns the offerHash; capture it from simulation result
      const offerHash = result as Hex;
      if (!offerHash) throw new Error('Could not read offer hash from simulation result');

      refetchDelegationData();
      return { txHash, offerHash };
    } catch (err: any) {
      const message = err.shortMessage || err.message || 'Deposit and offer delegation failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, publicClient, connectedAddress, walletClient, refetchDelegationData]);

  /**
   * Cancel an offer and withdraw back to the creator (creator only).
   * This matches the contract's internal `_cancelOfferAndWithdraw` behavior:
   * marks inactive, unlocks, withdraws, emits Cancelled, and deletes the offer.
   */
  const cancelOfferAndWithdraw = useCallback(async (offerHash: Hex): Promise<DelegationResult> => {
    if (!isCorrectNetwork) throw new Error('Please connect to the correct network');
    if (!publicClient || !connectedAddress) throw new Error('Wallet not connected');
    if (!walletClient) throw new Error('Wallet client not available');

    setIsLoading(true);
    setError(null);

    try {
      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'cancelOfferAndWithdraw',
        args: [offerHash],
        account: connectedAddress,
      });

      const txHash = await walletClient.writeContract(request) as Address;
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      refetchDelegationData();
      return { txHash, receipt };
    } catch (err: any) {
      const message = err.shortMessage || err.message || 'Cancel and withdraw failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, publicClient, connectedAddress, walletClient, refetchDelegationData]);

  /**
   * Accept a delegation offer (recipient only).
   */
  const acceptDelegationOffer = useCallback(async (offerHash: Hex): Promise<DelegationResult> => {
    if (!isCorrectNetwork) throw new Error('Please connect to the correct network');
    if (!publicClient || !connectedAddress) throw new Error('Wallet not connected');
    if (!walletClient) throw new Error('Wallet client not available');

    setIsLoading(true);
    setError(null);

    try {
      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'acceptDelegationOffer',
        args: [offerHash],
        account: connectedAddress,
      });

      const txHash = await walletClient.writeContract(request) as Address;
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      refetchDelegationData();
      return { txHash, receipt };
    } catch (err: any) {
      const message = err.shortMessage || err.message || 'Accept offer failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, publicClient, connectedAddress, walletClient, refetchDelegationData]);

  return {
    undelegateAndWithdraw,
    depositAndOfferDelegation,
    cancelOfferAndWithdraw,
    acceptDelegationOffer,
    refetch: refetchDelegationData,
    isLoading,
    error,
    currentEpoch,
  };
}