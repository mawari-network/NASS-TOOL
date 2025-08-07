'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { walletSteps } from '@/config/wallet-steps';
import { WalletStepContent } from './WalletStepContent';
import type { Wallet } from '@/types/wallet';
import { toast } from 'sonner';

interface WalletSetupProps {
  onCancel: () => void;
  onSaveWallet: (wallet: Wallet) => void;
  existingWallets: Wallet[];
  onComplete?: () => void; 
}

export function WalletSetup({ 
  onCancel, 
  onSaveWallet, 
  existingWallets,
  onComplete 
}: WalletSetupProps) {
  const [walletStep, setWalletStep] = useState(0);
  const [walletLabel, setWalletLabel] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | undefined>();
  
  const { isConnected, address } = useAccount();

  // Listen for MetaMask account changes
  useEffect(() => {
  const ethereum = window.ethereum;
  if (!ethereum) return;

  const handleAccountsChanged = (accounts: string[]) => {
    const newAddress = accounts[0]?.toLowerCase();
    if (newAddress !== currentAddress?.toLowerCase()) {
      // Reset state for new account
      setCurrentAddress(newAddress);
      setWalletStep(0);
      setWalletLabel('');
      setIsVerified(false);
      setError('');
    }
  };

  ethereum.on('accountsChanged', handleAccountsChanged);
  return () => {
    ethereum.removeListener('accountsChanged', handleAccountsChanged);
  };
}, [currentAddress]);

  const { signMessage, isPending: isSigningMessage } = useSignMessage();

  const handleSignMessage = async () => {
    try {
      await signMessage({ message: 'Verify wallet ownership for Mawari on Mawari Testnet' });
      // If we reach here, the message was signed successfully
      setIsVerified(true);
      setWalletStep(2);
      toast.success('Wallet verified successfully');
    } catch (error: any) {
      toast.error('Failed to verify wallet: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleFinish = async () => {
    if (!address || !walletLabel) {
      toast.error('Please provide a wallet label');
      return;
    }

    const walletExists = existingWallets.some(w => 
      w.address.toLowerCase() === address.toLowerCase()
    );
    
    if (walletExists) {
      setError('This wallet address has already been added');
      toast.error('Wallet already exists');
      return;
    }

    const newWallet: Wallet = {
      address,
      label: walletLabel,
      hasLicenses: false,
    };
    
    try {
      setIsSaving(true);
      await onSaveWallet(newWallet);
      toast.success('Wallet added successfully');
      // Wait a moment to show the success state
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save wallet';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle wallet changes
  useEffect(() => {
    if (address && address !== currentAddress) {
      setCurrentAddress(address);
      setWalletStep(0);
    }
  }, [address, currentAddress]);

  return (
    <div className="mt-6 bg-[#1A1525] rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Add Wallet</h2>
        <button
          onClick={onCancel}
          className="text-pink-400 hover:text-pink-300 transition-colors duration-200"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {walletSteps.map((step, stepIndex) => (
          <div key={step.id} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
                stepIndex === walletStep ? 'bg-pink-500' :
                stepIndex < walletStep ? 'bg-green-500' : 'bg-gray-700'
              }`}>
                {stepIndex < walletStep ? (
                  <span className="text-white text-sm">✓</span>
                ) : stepIndex === walletStep ? (
                  <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                ) : null}
              </div>
              {stepIndex < walletSteps.length - 1 && (
                <div className="w-0.5 h-16 bg-gray-700/50" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white">{step.title}</h3>
              <p className="text-gray-400 text-sm mt-1">{step.description}</p>
              {stepIndex === walletStep && (
                <WalletStepContent
                  step={stepIndex}
                  isConnected={isConnected}
                  address={address}
                  walletLabel={walletLabel}
                  isVerified={isVerified}
                  onLabelChange={setWalletLabel}
                  onVerify={handleSignMessage}
                  onNext={setWalletStep}
                  onFinish={handleFinish}
                  isSigningMessage={isSigningMessage}
                  isSaving={isSaving}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}