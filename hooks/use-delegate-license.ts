'use client';

import { useState } from 'react';
import { useWalletClient, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getContract, encodeFunctionData } from 'viem';
import { useAccount } from 'wagmi';
import { mawariTestnet } from '@/config/chains';
import {DELEGATION_ABI} from '@/config/contracts';
import { useNetworkCheck } from './use-network-check';

const DELEGATE_CONTRACT_ADDRESS = "0x623F0F0B867fdFF129385D2Fa891F7A777C6B797";



export function useDelegateLicense(selectedWalletAddress?: string) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const { isConnected: isCorrectNetwork } = useNetworkCheck();

  const offerDelegation = async (tokenId: string, delegateeAddress: string, commissionPercentage: number = 0, enable: boolean = true) => {
    if (!walletClient) {
      setError('Wallet not connected');
      throw new Error('Wallet not connected');
    }

    if (!isCorrectNetwork) {
      setError('Please connect to Mawari Testnet');
      throw new Error('Please connect to Mawari Testnet');
    }

    setIsLoading(true);
    setError(undefined);

    try {
      // Simulate the offer delegation first
      if (publicClient) {
        try {
          await publicClient.simulateContract({
            address: DELEGATE_CONTRACT_ADDRESS as `0x${string}`,
            abi: DELEGATION_ABI,
            functionName: 'offerDelegation',
            args: [
              delegateeAddress as `0x${string}`,
              BigInt(tokenId),
              commissionPercentage,
              enable
            ],
            account: walletClient.account,
          });
        } catch (simError: any) {
          console.error('❌ Offer delegation simulation failed:', simError);
          throw simError;
        }
      }

      // Execute the offer delegation
      const contract = getContract({
        address: DELEGATE_CONTRACT_ADDRESS as `0x${string}`,
        abi: DELEGATION_ABI,
        client: walletClient,
      });

      const txHash = await contract.write.offerDelegation([
        delegateeAddress as `0x${string}`,
        BigInt(tokenId),
        commissionPercentage,
        enable
      ]);

      console.log('✅ Offer delegation transaction sent:', txHash);

      // Wait for transaction receipt
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log('✅ Offer delegation transaction confirmed:', receipt);
      }

      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to offer delegation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const offerDelegationsMulticall = async (delegations: Array<{ tokenId: string; delegateeAddress: string; commissionPercentage?: number; enable?: boolean }>) => {
    if (!walletClient) {
      setError('Wallet not connected');
      throw new Error('Wallet not connected');
    }

    if (!isCorrectNetwork) {
      setError('Please connect to Mawari Testnet');
      throw new Error('Please connect to Mawari Testnet');
    }

    setIsLoading(true);
    setError(undefined);

    try {
      // Prepare multicall data for all selected licenses
      const calls = delegations.map(delegation => 
        encodeFunctionData({
          abi: DELEGATION_ABI,
          functionName: 'offerDelegation',
          args: [
            delegation.delegateeAddress as `0x${string}`,
            BigInt(delegation.tokenId),
            delegation.commissionPercentage ?? 0,
            delegation.enable ?? true
          ],
        })
      );

      console.log('📦 Multicall data prepared:', calls.length, 'calls');

      // Use the contract directly for multicall
      const contract = getContract({
        address: DELEGATE_CONTRACT_ADDRESS as `0x${string}`,
        abi: DELEGATION_ABI,
        client: walletClient,
      });

      // Simulate the multicall first
      if (publicClient) {
        try {
          await publicClient.simulateContract({
            address: DELEGATE_CONTRACT_ADDRESS as `0x${string}`,
            abi: DELEGATION_ABI,
            functionName: 'multicall',
            args: [calls],
            account: walletClient.account,
          });
        } catch (simError: any) {
          console.error('❌ Multicall simulation failed:', simError);
          if (simError.message?.includes('Sender not authorized') || 
              simError.cause?.message?.includes('Sender not authorized')) {
            throw new Error('Multicall not supported for this contract. Please try individual offer delegation.');
          }
          throw simError;
        }
      }

      // Execute the multicall
      const txHash = await contract.write.multicall([calls]);
      console.log('✅ Multicall transaction sent:', txHash);

      // Wait for transaction receipt
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log('✅ Multicall transaction confirmed:', receipt);
      }

      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute multicall offer delegation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    offerDelegation, 
    offerDelegationsMulticall, 
    isLoading: isLoading || isPending, 
    error,
    hash,
    receipt
  };
}