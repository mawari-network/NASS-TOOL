'use client';

import { useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { mawariTestnet, mawariMainnet } from '@/config/chains';
import { IS_TESTNET } from '@/lib/constant';

export function useNetworkCheck() {
  const {isConnected} = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    if (!isConnected) return;

    const expectedChainId = IS_TESTNET ? mawariTestnet.id : mawariMainnet.id;
    const expectedChainName = IS_TESTNET ? 'Mawari Testnet' : 'Mawari Mainnet';

    if (chainId !== expectedChainId) {
      alert(`Please connect to ${expectedChainName} (Chain ID: ${expectedChainId}) to use this application.`);
    }
  }, [isConnected, chainId]);

  const isCorrectNetwork = () => {
    if (!isConnected) return false;
    const expectedChainId = IS_TESTNET ? mawariTestnet.id : mawariMainnet.id;
    return chainId === expectedChainId;
  };

  return {
    isConnected: isCorrectNetwork(),
    expectedChainId: IS_TESTNET ? mawariTestnet.id : mawariMainnet.id,
    expectedChainName: IS_TESTNET ? 'Mawari Testnet' : 'Mawari Mainnet',
  }

}