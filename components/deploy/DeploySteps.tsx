'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Wallet } from '@/types/wallet';
import { WalletSetup } from './WalletSetup';
import { LicenseSelection } from './LicenseSelection';
import { DelegateLicenses } from './DelegateLicenses';
import { deploySteps } from '@/config/deploy-steps';
import { useWalletLicenses } from '@/hooks/use-wallet-licenses';
import { useAccount } from 'wagmi';
import { toast } from '@/hooks/use-toast';

interface DeployStepsProps {
  isAddingWallet: boolean;
  selectedWallet: Wallet | null;
  connectedWallets: Wallet[];
  isDropdownOpen: boolean;
  onAddWallet: () => void;
  onWalletSelect: (wallet: Wallet) => void;
  onDropdownToggle: (e: React.MouseEvent) => void;
  onCancel: () => void;
  onSaveWallet: (wallet: Wallet) => void;
  existingWallets: Wallet[];
}

export function DeploySteps({
  isAddingWallet,
  selectedWallet,
  connectedWallets,
  isDropdownOpen,
  onAddWallet,
  onWalletSelect,
  onDropdownToggle,
  onCancel,
  onSaveWallet,
  existingWallets,
}: DeployStepsProps) {
  const [selectedLicenses, setSelectedLicenses] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [showLicenseSelection, setShowLicenseSelection] = useState(false);
  const [lastConnectedWallet, setLastConnectedWallet] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  const { licenses: selectedWalletLicenses, isLoading: selectedWalletLoading } = useWalletLicenses();

  // Handle wallet connection
  const connectToWallet = async (walletAddress: string) => {
    if (!window.ethereum) {
      toast({
        title: "Error",
        description: "Please install MetaMask",
        variant: "destructive",
      });
      return false;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts[0]?.toLowerCase() === walletAddress.toLowerCase()) {
        window.localStorage.setItem('lastConnectedWallet', walletAddress);
        return true;
      }
      
      toast({
        title: "Error",
        description: "Please switch to the correct wallet in MetaMask",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to wallet",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleWalletSelect = useCallback(async (wallet: Wallet) => {
    try {
      const connected = await connectToWallet(wallet.address);
      if (connected) {
        onWalletSelect(wallet);
        setShowLicenseSelection(true);
        setCurrentStep(1);
        setLastConnectedWallet(wallet.address);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to wallet",
        variant: "destructive",
      });
    }
  }, [onWalletSelect]);

  // Effect to handle wallet persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('lastConnectedWallet');
      if (saved && address?.toLowerCase() === saved.toLowerCase()) {
        setLastConnectedWallet(saved);
      }
    }
  }, [address]);

  useEffect(() => {
    if (selectedWallet) {
      setCurrentStep(1);
      setShowLicenseSelection(true);
      setSelectedLicenses(new Set());
    } else {
      setCurrentStep(0);
      setShowLicenseSelection(false);
    }
  }, [selectedWallet?.address]);

  const handleLicenseSelect = useCallback((licenses: Set<string>) => {
    setSelectedLicenses(licenses);
    if (licenses.size > 0) {
      setCurrentStep(2);
      setShowLicenseSelection(false);
    }
  }, []);

  const handleDelegationComplete = useCallback(() => {
    setCurrentStep(3);
  }, []);

  const handleBackToLicenses = useCallback(() => {
    setCurrentStep(1);
    setShowLicenseSelection(true);
  }, []);

  return (
    <div className="space-y-8">
      {deploySteps.map((step, index) => (
        <div key={step.id} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              index === currentStep ? 'bg-pink-400' :
              index < currentStep ? 'bg-green-500' : 'bg-gray-700'
            }`}>
              {index < currentStep ? (
                <div className="text-white text-sm">✓</div>
              ) : index === currentStep ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <div className="text-white text-sm">{index + 1}</div>
              )}
            </div>
            {index < deploySteps.length - 1 && (
              <div className="w-0.5 h-16 bg-gray-700" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-gray-400 text-sm">{step.description}</p>
            
            {/* Wallet Selection */}
            {index === 0 && !isAddingWallet && (
              <div className="mt-4 flex gap-4 items-center">
                <div className="relative flex-1 wallet-dropdown">
                  <button
                    onClick={onDropdownToggle}
                    className="w-full px-4 py-3 bg-[#1A1525] rounded-lg border border-gray-700 flex items-center justify-between hover:border-pink-500/50 transition-colors"
                  >
                    <span className="text-gray-300">
                      {selectedWallet ? selectedWallet.label : 'Select wallet with licenses'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`} />
                  </button>
                  
                  {isDropdownOpen && connectedWallets.length > 0 && (
                    <div className="absolute w-full mt-2 bg-[#1A1525] border border-gray-700 rounded-lg shadow-xl z-10">
                      <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                        {connectedWallets.map((wallet, idx) => (
                          <button
                            key={wallet.address}
                            onClick={() => handleWalletSelect(wallet)}
                            className={`w-full px-4 py-3 text-left hover:bg-[#2D2438] flex items-center justify-between group ${
                              idx !== connectedWallets.length - 1 ? 'border-b border-gray-700/50' : ''
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white group-hover:text-pink-400 transition-colors">
                                {wallet.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                              </span>
                            </div>
                            <span className={`text-sm px-3 py-1 rounded-full ${
                              wallet.hasLicenses 
                                ? 'text-emerald-400 bg-emerald-400/10' 
                                : 'text-gray-400 bg-gray-400/10'
                            }`}>
                              {wallet.hasLicenses ? 'Has Licenses' : 'Select Wallet'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={onAddWallet}
                  className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors px-4 py-2 border border-transparent hover:border-pink-500/20 rounded-lg"
                >
                  + Add Wallet
                </button>
              </div>
            )}
            
            {/* Wallet Setup */}
            {index === 0 && isAddingWallet && (
              <WalletSetup 
                onCancel={onCancel} 
                onSaveWallet={onSaveWallet} 
                existingWallets={existingWallets} 
              />
            )}
            
            {/* License Selection */}
            {index === 1 && selectedWallet && showLicenseSelection && (
              <LicenseSelection 
                walletAddress={selectedWallet.address} 
                onLicenseSelect={handleLicenseSelect}
                selectedLicenses={selectedLicenses}
              />
            )}

            {/* License Delegation */}
            {index === 2 && currentStep >= 2 && selectedLicenses.size > 0 && (
              <>
                <button
                  onClick={handleBackToLicenses}
                  className="mt-4 text-pink-400 hover:text-pink-300 transition-colors"
                >
                  ← Back to License Selection
                </button>
                <DelegateLicenses
                  selectedLicenses={selectedLicenses}
                  onDelegationComplete={handleDelegationComplete}
                  selectedWalletAddress={selectedWallet!.address}
                />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}