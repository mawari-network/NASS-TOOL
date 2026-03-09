'use client';

import { useState, useCallback, useEffect } from 'react';
import { Address, getContract } from 'viem';
import { useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { useWalletClient, usePublicClient } from 'wagmi';
import { CONTRACT, License1155ABI } from '@/lib/constant';
import { useAccount } from 'wagmi';

interface UseApprovalParams {
  owner?: Address;
  operator?: Address;
  enabled?: boolean;
}

/**
 * Hook to check and set approval for License1155 contract
 * Used to grant the Delegation contract permission to transfer licenses
 */
export function useApproval({ owner, operator, enabled = true }: UseApprovalParams) {
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const effectiveOwner = owner || connectedAddress;
  
  const [isPending, setIsPending] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<Error | null>(null);
  
  // Use wagmi's useReadContract for automatic refetching and caching
  // This handles reverts gracefully by returning undefined on error
  const approvalQuery = useReadContract({
    address: CONTRACT.LICENSE_1155 as Address,
    abi: License1155ABI,
    functionName: 'isApprovedForAll',
    args: effectiveOwner && operator ? [effectiveOwner, operator] : undefined,
    query: {
      enabled: enabled && Boolean(effectiveOwner && operator),
      // Cache for 30 seconds - approval only changes after transactions
      staleTime: 30_000,
      // Keep in cache for 5 minutes
      gcTime: 300_000,
      // Refetch on window focus to catch updates from other tabs
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Retry failed requests (handles reverts gracefully)
      retry: (failureCount, error) => {
        // Don't retry on revert errors (treat as not approved)
        if (error?.message?.includes('revert') || error?.message?.includes('execution reverted')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: 1000,
    },
  });

  // Extract approval status - treat undefined/errors as not approved
  const isApproved = approvalQuery.data as boolean | undefined;
  const isCheckingApproval = approvalQuery.isLoading;

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  // Automatically refetch approval status after transaction confirms
  useEffect(() => {
    if (receipt) {
      // Refetch approval status after transaction confirms
      approvalQuery.refetch();
    }
  }, [receipt, approvalQuery]);

  const refetchApproval = useCallback(() => {
    return approvalQuery.refetch();
  }, [approvalQuery]);

  /**
   * Approve the operator (Delegation contract) to transfer licenses
   */
  const approve = async () => {
    if (!effectiveOwner || !operator) {
      throw new Error('Owner and operator addresses are required');
    }

    if (!walletClient) {
      throw new Error('Please connect your wallet first');
    }

    if (!publicClient) {
      throw new Error('Public client not available. Please check your network connection.');
    }

    setIsPending(true);
    setError(null);
    setHash(undefined);

    try {
      // Simulate the transaction first
      await publicClient.simulateContract({
        address: CONTRACT.LICENSE_1155 as Address,
        abi: License1155ABI,
        functionName: 'setApprovalForAll',
        args: [operator, true],
        account: walletClient.account,
      });

      // Execute the approval using viem's getContract
      const contract = getContract({
        address: CONTRACT.LICENSE_1155 as Address,
        abi: License1155ABI,
        client: walletClient,
      });

      const txHash = await contract.write.setApprovalForAll([operator, true]);
      setHash(txHash);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Refetch approval status after transaction confirms
      // Wagmi will handle the refetch automatically via the useEffect above
      // But we can also trigger it immediately here for faster UI update
      await approvalQuery.refetch();
      
      return txHash;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to approve';
      setError(err);
      throw new Error(errorMessage);
    } finally {
      setIsPending(false);
    }
  };

  /**
   * Revoke approval for the operator
   */
  const revokeApproval = async () => {
    if (!effectiveOwner || !operator) {
      throw new Error('Owner and operator addresses are required');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    if (!publicClient) {
      throw new Error('Public client not available');
    }

    setIsPending(true);
    setError(null);
    setHash(undefined);

    try {
      // Simulate the transaction first
      await publicClient.simulateContract({
        address: CONTRACT.LICENSE_1155 as Address,
        abi: License1155ABI,
        functionName: 'setApprovalForAll',
        args: [operator, false],
        account: walletClient.account,
      });

      // Execute the revocation using viem's getContract
      const contract = getContract({
        address: CONTRACT.LICENSE_1155 as Address,
        abi: License1155ABI,
        client: walletClient,
      });

      const txHash = await contract.write.setApprovalForAll([operator, false]);
      setHash(txHash);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Refetch approval status after transaction confirms
      // Wagmi will handle the refetch automatically via the useEffect above
      // But we can also trigger it immediately here for faster UI update
      await approvalQuery.refetch();
      
      return txHash;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to revoke approval';
      setError(err);
      throw new Error(errorMessage);
    } finally {
      setIsPending(false);
    }
  };

  return {
    // Read state
    isApproved: isApproved,
    isLoading: isCheckingApproval,
    error: error,
    
    // Write functions
    approve,
    revokeApproval,
    
    // Transaction state
    hash,
    receipt,
    isPending,
    isConfirming,
    isTransactionPending: isPending || isConfirming,
    
    // Utilities
    refetchApproval,
  };
}
