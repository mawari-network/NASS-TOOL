'use client';

import { useState, useEffect } from 'react';
import { useDelegateLicense } from '@/hooks/use-delegate-license';
import { useAccount } from 'wagmi';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface DelegateLicensesProps {
  selectedLicenses: Set<string>;
  onDelegationComplete: () => void;
  selectedWalletAddress: string;
}

export function DelegateLicenses({ 
  selectedLicenses, 
  onDelegationComplete,
  selectedWalletAddress 
}: DelegateLicensesProps) {
  const [delegateeAddress, setDelegateeAddress] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [delegatedLicenses, setDelegatedLicenses] = useState<string[]>([]);
  const { offerDelegation, offerDelegationsMulticall, isLoading, error, hash, receipt } = useDelegateLicense(selectedWalletAddress);
  const { address: connectedAddress } = useAccount();
  const { toast } = useToast();

  // Handle transaction receipt for multicall
  useEffect(() => {
    if (receipt) {
      console.log('✅ Multicall transaction confirmed:', receipt);
      toast({
        title: "Success!",
        description: `Successfully offered delegation for ${selectedLicenses.size} license${selectedLicenses.size > 1 ? 's' : ''}! Transaction hash: ${hash}`,
      });
      setDelegatedLicenses(Array.from(selectedLicenses));
      onDelegationComplete();
    }
  }, [receipt, hash, selectedLicenses, toast, onDelegationComplete]);

  const handleDelegation = async () => {
    if (!delegateeAddress || !/^0x[a-fA-F0-9]{40}$/.test(delegateeAddress)) {
      toast({
        title: "Error",
        description: "Please enter a valid address",
        variant: "destructive",
      });
      return;
    }

    // Check if the connected address matches the selected wallet
    if (connectedAddress?.toLowerCase() !== selectedWalletAddress.toLowerCase()) {
      toast({
        title: "Error",
        description: "Please switch to the wallet that owns these licenses",
        variant: "destructive",
      });
      return;
    }

    const licenses = Array.from(selectedLicenses);
    
    // Use multicall for optimal gas efficiency
    try {
      const delegations = licenses.map(tokenId => ({
        tokenId,
        delegateeAddress,
        commissionPercentage: 0, // Default to 0% commission
        enable: true
      }));

      await offerDelegationsMulticall(delegations);
      // Transaction receipt will be handled by useEffect
    } catch (err) {
      // Error is already handled by the hook
      console.error('Multicall error:', err);
    }
  };

  const isWrongWallet = connectedAddress?.toLowerCase() !== selectedWalletAddress.toLowerCase();
  const isCorrectWallet = connectedAddress?.toLowerCase() === selectedWalletAddress.toLowerCase();

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Offer License Delegation</h3>
        
        {isWrongWallet && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-400 text-sm font-medium mb-2">
                  Wrong wallet connected
                </p>
                <p className="text-yellow-300 text-sm mb-3">
                  Please connect to the wallet that owns these licenses:
                </p>
                <div className="bg-[#2D2438] p-2 rounded border border-yellow-500/20 mb-3">
                  <span className="font-mono text-xs text-yellow-200 break-all">
                    {selectedWalletAddress}
                  </span>
                </div>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            </div>
          </div>
        )}

        {isCorrectWallet && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                <div className="w-2 h-2 bg-green-900 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-green-400 text-sm font-medium mb-1">
                  Correct wallet connected
                </p>
                <p className="text-green-300 text-sm">
                  You can now proceed with the delegation
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Delegate to Address
            </label>
            <input
              type="text"
              value={delegateeAddress}
              onChange={(e) => setDelegateeAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#2D2438] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-colors"
            />
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Note:</strong> This will create delegation offers with 0% commission. The delegatee will need to accept these offers to complete the delegation.
            </p>
          </div>

          {/* <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">
              <strong>Multicall enabled:</strong> {selectedLicenses.size > 1 ? `All ${selectedLicenses.size} licenses` : 'This license'} will be delegated using multicall for optimal gas efficiency.
            </p>
          </div> */}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-red-400 text-sm">
                  <div className="font-medium mb-1">Transaction Failed</div>
                  <div className="text-xs text-red-300 break-all">
                    {error.includes('User rejected') 
                      ? 'Transaction was rejected. Please try again and confirm the transaction in your wallet.'
                      : error
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleDelegation}
          disabled={isLoading || !delegateeAddress || isWrongWallet}
          className="px-6 py-2 bg-pink-400 text-white rounded-lg hover:bg-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Processing...' : 'Offer Delegation (Multicall)'}
        </button>
      </div>
    </div>
  );
}