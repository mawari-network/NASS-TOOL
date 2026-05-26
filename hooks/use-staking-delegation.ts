'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Address } from 'viem';
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

  const delegationAddrLower = (CONTRACT.DELEGATION as string).toLowerCase();

  const refetchDelegationData = useCallback(() => {
    function keyContainsAddress(keyPart: unknown): boolean {
      if (keyPart === null || keyPart === undefined) return false;
      if (typeof keyPart === 'string') return keyPart.toLowerCase() === delegationAddrLower;
      if (typeof keyPart === 'object' && keyPart !== null && 'address' in (keyPart as object))
        return String((keyPart as { address?: unknown }).address).toLowerCase() === delegationAddrLower;
      if (Array.isArray(keyPart)) return keyPart.some(keyContainsAddress);
      if (typeof keyPart === 'object' && keyPart !== null)
        return Object.values(keyPart as object).some(keyContainsAddress);
      return false;
    }
    const predicate = (query: { queryKey: readonly unknown[] }) => keyContainsAddress(query.queryKey);
    queryClient.invalidateQueries({ predicate });
    queryClient.refetchQueries({ predicate });
  }, [queryClient, delegationAddrLower]);

  const handleUndelegateAndWithdraw = useCallback(async (params: BaseDelegationParams): Promise<DelegationResult> => {
    if (!isCorrectNetwork) throw new Error('Please connect to the correct network');
    if (!publicClient || !connectedAddress) throw new Error('Wallet not connected');
    if (!walletClient) throw new Error('Wallet client not available');

    setIsLoading(true);
    setError(null);

    try {
      const amountArg = typeof params.amount === 'bigint' ? params.amount : BigInt(String(params.amount));
      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'undelegateAndWithdraw',
        args: [BigInt(params.tier), params.nodeAddress, amountArg],
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

  const batchUndelegateAndWithdraw = useCallback(async (
    params: BaseDelegationParams[],
  ): Promise<DelegationResult> => {
    if (!isCorrectNetwork) throw new Error('Please connect to the correct network');
    if (!publicClient || !connectedAddress) throw new Error('Wallet not connected');
    if (!walletClient) throw new Error('Wallet client not available');

    setIsLoading(true);
    setError(null);

    try {
      const contractParams = params.map((p) => ({
        tier: BigInt(p.tier),
        node: p.nodeAddress,
        amount: typeof p.amount === 'bigint' ? p.amount : BigInt(String(p.amount)),
      }));

      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'batchUndelegateAndWithdraw',
        args: [contractParams],
        account: connectedAddress,
      });

      const txHash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      refetchDelegationData();
      return { txHash, receipt };
    } catch (err: any) {
      console.error('Error in batchUndelegateAndWithdraw:', err);
      const message = err.shortMessage || err.message || 'Batch undelegate and withdraw failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, publicClient, connectedAddress, walletClient, refetchDelegationData]);

  return {
    undelegateAndWithdraw,
    batchUndelegateAndWithdraw,
    refetch: refetchDelegationData,
    isLoading,
    error,
    currentEpoch,
  };
}