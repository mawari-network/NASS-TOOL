'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletLicenses } from './use-wallet-licenses';
import type { Wallet } from '@/types/wallet';

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { licenses, isLoading: licensesLoading } = useWalletLicenses();

  // Load wallets from API
  useEffect(() => {
    async function fetchWallets() {
      try {
        const response = await fetch('/api/wallets');
        if (!response.ok) throw new Error('Failed to fetch wallets');
        const data = await response.json();
        setWallets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load wallets');
        console.error('Failed to load wallets:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWallets();
  }, []);

  // Update wallet license status whenever licenses change
  useEffect(() => {
    if (!selectedWallet || licensesLoading) return;

    const hasLicenses = licenses.length > 0;
    const currentWalletHasLicenses = wallets.find(
      w => w.address.toLowerCase() === selectedWallet.address.toLowerCase()
    )?.hasLicenses;

    // Only update if the license status has changed
    if (currentWalletHasLicenses !== hasLicenses) {
      updateWallet(selectedWallet.address, { hasLicenses });
    }
  }, [selectedWallet?.address, licenses, licensesLoading]);

  const addWallet = useCallback(async (wallet: Wallet) => {
    try {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wallet),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add wallet');
      }

      const newWallet = await response.json();
      setWallets(prev => [...prev, newWallet]);
      setSelectedWallet(newWallet);
      return newWallet;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add wallet');
    }
  }, []);

  const updateWallet = useCallback(async (address: string, updates: Partial<Wallet>) => {
    try {
      const response = await fetch(`/api/wallets/${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update wallet');
      }

      const updatedWallet = await response.json();
      
      setWallets(prev => prev.map(w => 
        w.address.toLowerCase() === address.toLowerCase() ? updatedWallet : w
      ));
      
      if (selectedWallet?.address.toLowerCase() === address.toLowerCase()) {
        setSelectedWallet(updatedWallet);
      }
    } catch (err) {
      console.error('Error updating wallet:', err);
    }
  }, [selectedWallet]);

  return {
    wallets,
    selectedWallet,
    setSelectedWallet,
    loading,
    error,
    addWallet,
    updateWallet
  };
}