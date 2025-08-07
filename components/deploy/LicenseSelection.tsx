'use client';

import { useState, useEffect } from 'react';
import { useWalletLicenses } from '@/hooks/use-wallet-licenses';
import { Loader2 } from 'lucide-react';

interface LicenseSelectionProps {
  walletAddress: string;
  onLicenseSelect: (licenses: Set<string>) => void;
  selectedLicenses: Set<string>;
}

export function LicenseSelection({ 
  walletAddress, 
  onLicenseSelect,
  selectedLicenses: initialSelectedLicenses 
}: LicenseSelectionProps) {
  const { licenses, isLoading, totalBalance, hasMorePages, loadMoreLicenses } = useWalletLicenses();
  const [localSelectedLicenses, setLocalSelectedLicenses] = useState<Set<string>>(initialSelectedLicenses);

  useEffect(() => {
    setLocalSelectedLicenses(initialSelectedLicenses);
  }, [initialSelectedLicenses]);

  const toggleLicense = (tokenId: string) => {
    const newSelected = new Set(localSelectedLicenses);
    if (newSelected.has(tokenId)) {
      newSelected.delete(tokenId);
    } else {
      newSelected.add(tokenId);
    }
    setLocalSelectedLicenses(newSelected);
  };

  const handleContinue = () => {
    onLicenseSelect(localSelectedLicenses);
  };

  if (isLoading) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center p-8 bg-[#1A1525] rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A3FFC] mb-4" />
        <p className="text-gray-400">Loading licenses...</p>
      </div>
    );
  }

  if (!licenses.length) {
    return (
      <div className="mt-4 p-6 bg-[#1A1525] rounded-lg">
        <p className="text-red-400 text-center font-medium">No licenses found in this wallet</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-sm text-gray-400">Showing: </span>
          <span className="font-semibold">{licenses.length}</span>
          {totalBalance > licenses.length && (
            <span className="text-xs text-gray-500 ml-1">of {totalBalance} total</span>
          )}
        </div>
        <div>
          <span className="text-sm text-gray-400">Selected: </span>
          <span className="font-semibold">{localSelectedLicenses.size}</span>
        </div>
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-[#8A3FFC] scrollbar-track-[#2D2438] scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {licenses.map((license) => (
            <div
              key={license.tokenId}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                localSelectedLicenses.has(license.tokenId.toString())
                  ? 'bg-[#2D2438] border-[#8A3FFC] shadow-[#8A3FFC]/20'
                  : 'bg-[#1A1525] border-gray-700 hover:border-[#8A3FFC]/50'
              }`}
              onClick={() => toggleLicense(license.tokenId.toString())}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-400">License ID</div>
                  <div className="font-mono">{license.tokenId}</div>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  license.selected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {license.selected ? 'Selected' : 'Available'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {localSelectedLicenses.size > 0 && (
        <div className="sticky bottom-0 bg-[#0F0B1E] pt-4">
          <div className="flex flex-col gap-2 p-4 bg-[#2D2438] rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">Selected Licenses</div>
                <div className="text-lg font-semibold">{localSelectedLicenses.size}</div>
              </div>
              <button 
                onClick={handleContinue}
                className="px-6 py-2 bg-[#8A3FFC] text-white rounded-lg hover:bg-[#9B51E0] transition-colors"
              >
                Continue to Delegation
              </button>
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-400 mb-1">Selected License IDs:</div>
              <div className="flex flex-wrap gap-2">
                {Array.from(localSelectedLicenses).map(licenseId => (
                  <div key={licenseId} className="px-3 py-1 bg-[#1A1525] rounded-lg text-sm font-mono">
                    {licenseId}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {hasMorePages && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMoreLicenses}
            disabled={isLoading}
            className="px-6 py-2 bg-[#8A3FFC] text-white rounded-lg hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Loading...' : 'Load More Licenses'}
          </button>
        </div>
      )}
    </div>
  );
}