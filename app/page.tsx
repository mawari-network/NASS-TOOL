'use client';

import { useState, useCallback, useEffect } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DeploySteps } from '@/components/deploy/DeploySteps';
import { useWallets } from '@/hooks/use-wallets';
import type { Wallet } from '@/types/wallet';

export default function Home() {
  const {
    wallets: connectedWallets,
    selectedWallet,
    setSelectedWallet,
    addWallet,
    updateWallet
  } = useWallets();

  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize database on app load
  useEffect(() => {
    async function initDb() {
      try {
        const response = await fetch('/api/init-db', { method: 'POST' });
        if (!response.ok) {
          throw new Error('Failed to initialize database');
        }
      } catch (err) {
        console.error('Database initialization error:', err);
      }
    }
    initDb();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.wallet-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleAddWallet = useCallback(() => {
    setIsAddingWallet(true);
    setIsDropdownOpen(false);
    setError('');
  }, []);

  const handleWalletSelect = useCallback((wallet: Wallet) => {
    setSelectedWallet(wallet);
    setIsDropdownOpen(false);
    setError('');
  }, [setSelectedWallet]);

  const handleCancel = useCallback(() => {
    setIsAddingWallet(false);
    setError('');
  }, []);

  const handleSaveWallet = useCallback((wallet: Wallet) => {
    try {
      addWallet(wallet);
      setIsAddingWallet(false);
      setError('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  }, [addWallet]);

  const handleDropdownToggle = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDropdownOpen(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0B1E] text-white flex flex-col">
      <Breadcrumb />
      
      <div className="flex-1 px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#13111C]/80 rounded-xl p-8">
            <h1 className="text-2xl font-semibold mb-8">Deploy Mawari Nodes</h1>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}
            
            <DeploySteps
              isAddingWallet={isAddingWallet}
              selectedWallet={selectedWallet}
              connectedWallets={connectedWallets}
              isDropdownOpen={isDropdownOpen}
              onAddWallet={handleAddWallet}
              onWalletSelect={handleWalletSelect}
              onDropdownToggle={handleDropdownToggle}
              onCancel={handleCancel}
              onSaveWallet={handleSaveWallet}
              existingWallets={connectedWallets}
            />
          </div>
        </div>
      </div>
    </div>
  );
}