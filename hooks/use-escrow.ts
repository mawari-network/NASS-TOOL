'use client';

import { useState, useCallback } from 'react';
import { Address, getContract, decodeErrorResult } from 'viem';
import { useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { useWalletClient, usePublicClient } from 'wagmi';
import { CONTRACT, LicenseEscrowABI, License1155ABI } from '@/lib/constant';
import { useAccount } from 'wagmi';
import { useNetworkCheck } from './use-network-check';
import { useApproval } from './use-approval';

interface DepositParams {
  tier: number;
  amount: bigint;
}

/**
 * Hook for managing LicenseEscrow operations
 * Handles deposit and withdrawal of licenses
 */
export function useEscrow() {
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isConnected: isCorrectNetwork } = useNetworkCheck();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  // Note: Wagmi automatically refetches related queries when transactions confirm
  // via the query options (refetchOnWindowFocus, refetchOnReconnect, etc.)
  // We don't need to manually invalidate queries since wagmi uses its own query key format

  /**
   * Deposit licenses to LicenseEscrow
   */
  const depositLicense = useCallback(async ({ tier, amount }: DepositParams) => {
    if (!isCorrectNetwork) {
      throw new Error('Please connect to the correct network');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    if (!publicClient) {
      throw new Error('Public client not available');
    }

    if (!connectedAddress) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);
    setHash(undefined);

    try {
      // Check available balance first to provide better error messages
      try {
        const availableBalance = await publicClient.readContract({
          address: CONTRACT.LICENSE_1155 as Address,
          abi: License1155ABI,
          functionName: 'getAvailableBalance',
          args: [connectedAddress, BigInt(tier)],
        }) as bigint;
        
        if (availableBalance < amount) {
          const lockedBalance = await publicClient.readContract({
            address: CONTRACT.LICENSE_1155 as Address,
            abi: License1155ABI,
            functionName: 'getLockedBalance',
            args: [connectedAddress, BigInt(tier)],
          }) as bigint;
          
          throw new Error(
            `Insufficient available balance. You have ${availableBalance.toString()} available licenses (${lockedBalance.toString()} are locked). Please unlock licenses or reduce the amount.`
          );
        }
      } catch (balanceCheckErr: any) {
        // If getAvailableBalance doesn't exist or fails, continue with the deposit attempt
        // The contract will revert with a proper error if there's an issue
        console.warn('Could not check available balance:', balanceCheckErr);
      }

      // Simulate the transaction first
      await publicClient.simulateContract({
        address: CONTRACT.LICENSE_ESCROW as Address,
        abi: LicenseEscrowABI,
        functionName: 'depositLicense',
        args: [BigInt(tier), amount],
        account: connectedAddress,
      });

      // Execute the deposit using viem's getContract
      const contract = getContract({
        address: CONTRACT.LICENSE_ESCROW as Address,
        abi: LicenseEscrowABI,
        client: walletClient,
      });

      const txHash = await contract.write.depositLicense([BigInt(tier), amount]);
      setHash(txHash);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      return { txHash, receipt };
    } catch (err: any) {
      // Try to decode the error for better error messages
      let errorMessage = 'Failed to deposit license';
      
      if (err?.data || err?.cause?.data) {
        try {
          const errorData = err?.data || err?.cause?.data;
          
          // Try decoding with LicenseEscrow ABI first
          try {
            const decoded = decodeErrorResult({
              abi: LicenseEscrowABI,
              data: errorData as `0x${string}`,
            });
            
            // Map common errors to user-friendly messages
            const errorMessages: Record<string, string> = {
              'InsufficientNFTBalance': 'You do not have enough licenses in your wallet. Please check your balance.',
              'InvalidTier': 'Invalid tier. Please select tier 1, 2, or 3.',
              'EnforcedPause': 'The contract is currently paused. Please try again later.',
              'ZeroAmount': 'Amount must be greater than zero.',
              'TransferFailed': 'Failed to transfer licenses. Please try again.',
            };
            
            errorMessage = errorMessages[decoded.errorName] || `Contract error: ${decoded.errorName}`;
          } catch (escrowDecodeErr) {
            // If LicenseEscrow decode fails, try License1155 ABI
            // (The error might be bubbling up from the token transfer)
            try {
              const decoded = decodeErrorResult({
                abi: License1155ABI,
                data: errorData as `0x${string}`,
              });
              
              const errorMessages: Record<string, string> = {
                'ERC1155InsufficientBalance': 'Insufficient balance. Some licenses may be locked.',
                'ERC1155MissingApprovalForAll': 'Approval not granted. Please approve the escrow contract first.',
                'InsufficientAvailableBalance': 'Insufficient available balance. Some licenses may be locked.',
                'LockedBalance': 'Some licenses are locked and cannot be transferred.',
              };
              
              errorMessage = errorMessages[decoded.errorName] || `Token contract error: ${decoded.errorName}`;
            } catch (tokenDecodeErr) {
              // If both fail, check if it's a known error signature
              const errorSig = (errorData as string).slice(0, 10);
              if (errorSig === '0xe201ec73') {
                errorMessage = 'Insufficient available balance. Some licenses may be locked. Please check your available balance using getAvailableBalance.';
              } else {
                errorMessage = err?.message || err?.shortMessage || `Failed to deposit license (error: ${errorSig})`;
              }
            }
          }
        } catch (decodeErr) {
          // If decoding fails completely, use the original error message
          errorMessage = err?.message || err?.shortMessage || 'Failed to deposit license';
        }
      } else {
        errorMessage = err?.message || err?.shortMessage || 'Failed to deposit license';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, walletClient, publicClient, connectedAddress]);

  /**
   * Deposit multiple licenses (different tiers) in one transaction
   */
  const depositLicenses = useCallback(async (tiers: number[], amounts: bigint[]) => {
    if (!isCorrectNetwork) {
      throw new Error('Please connect to the correct network');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    if (!publicClient) {
      throw new Error('Public client not available');
    }

    if (!connectedAddress) {
      throw new Error('Wallet not connected');
    }

    if (tiers.length !== amounts.length) {
      throw new Error('Tiers and amounts arrays must have the same length');
    }

    setIsLoading(true);
    setError(null);
    setHash(undefined);

    try {
      // Simulate the transaction first
      await publicClient.simulateContract({
        address: CONTRACT.LICENSE_ESCROW as Address,
        abi: LicenseEscrowABI,
        functionName: 'depositLicenses',
        args: [tiers.map(t => BigInt(t)), amounts],
        account: connectedAddress,
      });

      // Execute the deposit using viem's getContract
      const contract = getContract({
        address: CONTRACT.LICENSE_ESCROW as Address,
        abi: LicenseEscrowABI,
        client: walletClient,
      });

      const txHash = await contract.write.depositLicenses([tiers.map(t => BigInt(t)), amounts]);
      setHash(txHash);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      return { txHash, receipt };
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to deposit licenses';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, walletClient, publicClient, connectedAddress]);

  /**
   * Withdraw licenses from LicenseEscrow
   */
  const withdrawLicense = useCallback(async (tier: number, amount: bigint) => {
    if (!isCorrectNetwork) {
      throw new Error('Please connect to the correct network');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    if (!publicClient) {
      throw new Error('Public client not available');
    }

    if (!connectedAddress) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);
    setHash(undefined);

    try {
      // Simulate the transaction first
      await publicClient.simulateContract({
        address: CONTRACT.LICENSE_ESCROW as Address,
        abi: LicenseEscrowABI,
        functionName: 'withdrawLicense',
        args: [BigInt(tier), amount],
        account: connectedAddress,
      });

      // Execute the withdrawal using viem's getContract
      const contract = getContract({
        address: CONTRACT.LICENSE_ESCROW as Address,
        abi: LicenseEscrowABI,
        client: walletClient,
      });

      const txHash = await contract.write.withdrawLicense([BigInt(tier), amount]);
      setHash(txHash);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      return { txHash, receipt };
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to withdraw license';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, walletClient, publicClient, connectedAddress]);

  return {
    depositLicense,
    depositLicenses,
    withdrawLicense,
    isLoading: isLoading || isConfirming,
    error,
    hash,
    receipt,
    isPending: isLoading,
    isConfirming,
  };
}

/**
 * Hook to check escrowed balance for a user and tier
 * Uses wagmi's built-in refetching - automatically refetches when:
 * - Transaction receipts confirm (via queryClient invalidation)
 * - Window regains focus (if enabled)
 * - Network reconnects (if enabled)
 */
interface UseEscrowBalanceParams {
  user?: Address;
  tier?: number;
  enabled?: boolean;
}

export function useEscrowBalance({ user, tier, enabled = true }: UseEscrowBalanceParams) {
  const result = useReadContract({
    address: CONTRACT.LICENSE_ESCROW as Address,
    abi: LicenseEscrowABI,
    functionName: 'getEscrowedBalance',
    args: user && tier !== undefined ? [user, BigInt(tier)] : undefined,
    query: {
      enabled: enabled && Boolean(user && tier !== undefined),
      // Cache for 30 seconds - balance changes after transactions
      staleTime: 30_000,
      // Keep in cache for 5 minutes
      gcTime: 300_000,
      // Refetch on window focus to catch updates from other tabs
      refetchOnWindowFocus: true,
      // Refetch on reconnect to catch updates after network issues
      refetchOnReconnect: true,
      // Retry failed requests
      retry: 2,
      retryDelay: 1000,
    },
  });

  return {
    ...result,
    data: result.data as bigint | undefined,
    escrowedBalance: result.data as bigint | undefined,
    // Expose refetch for manual refresh if needed
    refetch: result.refetch,
  };
}

/**
 * Hook to check if user has approval for LicenseEscrow
 * This is a convenience wrapper around useApproval
 */
export function useEscrowApproval(userAddress?: Address) {
  const { address: connectedAddress } = useAccount();
  const effectiveAddress = userAddress || connectedAddress;
  const escrowAddress = CONTRACT.LICENSE_ESCROW as Address;

  // Wagmi automatically refetches when dependencies (owner, operator) change
  // No manual refetch needed - wagmi handles it via useReadContract's query dependencies
  const approval = useApproval({
    owner: effectiveAddress,
    operator: escrowAddress,
    enabled: !!effectiveAddress,
  });

  return approval;
}
