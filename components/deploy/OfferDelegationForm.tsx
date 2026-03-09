'use client';

import { Loader2 } from 'lucide-react';

export interface OfferDelegationFormProps {
  tier: 1 | 2 | 3;
  setTier: (t: 1 | 2 | 3) => void;
  offerToAddress: string;
  setOfferToAddress: (s: string) => void;
  offerAmount: string;
  setOfferAmount: (s: string) => void;
  isValidOfferTo: boolean;
  isValidOfferAmount: boolean;
  isDepositing: boolean;
  getBalanceForTier: (tier: number) => { total?: bigint } | undefined;
  isBalanceLoading: boolean;
  onCreateOffer: () => void;
}

export function OfferDelegationForm({
  tier,
  setTier,
  offerToAddress,
  setOfferToAddress,
  offerAmount,
  setOfferAmount,
  isValidOfferTo,
  isValidOfferAmount,
  isDepositing,
  getBalanceForTier,
  isBalanceLoading,
  onCreateOffer,
}: OfferDelegationFormProps) {
  return (
    <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700 space-y-4">
      <h3 className="text-lg font-semibold text-white">Offer delegation to an address</h3>
      <p className="text-sm text-gray-400">
        Create an offer; the recipient can accept later and receive the delegated licenses.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-2">License Tier</label>
          <select
            value={tier}
            onChange={(e) => setTier(Number(e.target.value) as 1 | 2 | 3)}
            className="w-full bg-[#2D2438] border border-gray-600 rounded p-2 text-white text-sm"
            disabled={isDepositing}
          >
            <option value={1}>Tier 1 </option>
            <option value={2}>Tier 2</option>
            <option value={3}>Tier 3</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-2">Recipient address</label>
          <input
            type="text"
            placeholder="0x..."
            value={offerToAddress}
            onChange={(e) => setOfferToAddress(e.target.value)}
            className={`w-full bg-[#2D2438] border rounded p-2 text-white text-sm font-mono ${
              offerToAddress && !isValidOfferTo ? 'border-red-500' : 'border-gray-600'
            }`}
            disabled={isDepositing}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-2">Amount</label>
          <input
            type="number"
            placeholder="0"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            className="w-full bg-[#2D2438] border border-gray-600 rounded p-2 text-white text-sm"
            disabled={isDepositing}
          />
          <p className="text-[12px] text-[#737373] mt-1">
            Available: {isBalanceLoading ? '...' : Number(getBalanceForTier(tier)?.total ?? 0)}
          </p>
        </div>
      </div>
      <button
        onClick={onCreateOffer}
        disabled={isDepositing || !isValidOfferTo || !isValidOfferAmount}
        className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isDepositing && <Loader2 className="w-4 h-4 animate-spin" />}
        Create delegation offer
      </button>
    </div>
  );
}
