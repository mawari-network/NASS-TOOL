'use client';

import { useState, useEffect } from 'react';
import { type Address } from 'viem';
import type { Hex } from 'viem';
import { Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDelegationOffer, isOfferGoneError } from '@/hooks/use-delegation-offers';
import { TIER_LABELS } from '@/config/deploy-constants';

export interface PendingDelegationOffersSectionProps {
  myAddress: Address;
  offerHashes: Hex[];
  onRemoveHash: (hash: Hex) => void;
  onCancelOffer: (hash: Hex) => void;
  cancelingOfferHash: Hex | null;
  loaded: boolean;
}

export function PendingDelegationOffersSection({
  myAddress,
  offerHashes,
  onRemoveHash,
  onCancelOffer,
  cancelingOfferHash,
  loaded,
}: PendingDelegationOffersSectionProps) {
  return (
    <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Pending delegation offers</h3>
      </div>
      {!loaded ? (
        <div className="py-8 flex items-center justify-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading pending offers…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Pending delegation offers">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 pr-4">Offer ID</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4">Offer to</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {offerHashes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                    No pending offers. Create an offer below to delegate to an address (recipient can accept later).
                  </td>
                </tr>
              ) : (
                offerHashes.map((hash) => (
                  <PendingOfferRow
                    key={hash}
                    offerHash={hash}
                    myAddress={myAddress}
                    onRemoveHash={onRemoveHash}
                    onCancelOffer={onCancelOffer}
                    cancelingOfferHash={cancelingOfferHash}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PendingOfferRow({
  offerHash,
  myAddress,
  onRemoveHash,
  onCancelOffer,
  cancelingOfferHash,
}: {
  offerHash: Hex;
  myAddress: Address;
  onRemoveHash: (hash: Hex) => void;
  onCancelOffer: (hash: Hex) => void;
  cancelingOfferHash: Hex | null;
}) {
  const { toast } = useToast();
  const [confirmCancelHash, setConfirmCancelHash] = useState<Hex | null>(null);
  const { offerData, isLoading, error } = useDelegationOffer(offerHash);

  useEffect(() => {
    if (error && isOfferGoneError(error)) {
      onRemoveHash(offerHash);
      return;
    }
    if (offerData && !offerData.isActive) onRemoveHash(offerHash);
  }, [offerData?.isActive, offerHash, onRemoveHash, offerData, error]);

  const handleCopyOfferId = () => {
    if (typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(offerHash);
      toast({ title: 'Offer ID copied', description: 'Pasted to clipboard.' });
    }
  };

  const handleCancelClick = () => setConfirmCancelHash(offerHash);
  const handleConfirmCancel = () => {
    if (confirmCancelHash) {
      onCancelOffer(confirmCancelHash);
      setConfirmCancelHash(null);
    }
  };
  const handleDismissConfirm = () => setConfirmCancelHash(null);

  if (offerData && !offerData.isActive) return null;

  if (isLoading) {
    return (
      <tr className="border-b border-gray-700/50">
        <td colSpan={6} className="py-3 text-center text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin inline" aria-hidden />
        </td>
      </tr>
    );
  }

  if (!offerData) {
    const shortHash = `${offerHash.slice(0, 10)}…${offerHash.slice(-8)}`;
    return (
      <tr className="border-b border-gray-700/50 hover:bg-[#2D2438]/30">
        <td className="py-3 pr-4 font-mono text-gray-500 text-xs">{shortHash}</td>
        <td colSpan={3} className="py-3 pr-4 text-gray-500 text-sm italic">
          Offer not found or no longer active
        </td>
        <td className="py-3 pr-4">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">Stale</span>
        </td>
        <td className="py-3 text-right">
          <button
            type="button"
            onClick={() => onRemoveHash(offerHash)}
            className="px-3 py-1.5 text-gray-400 hover:text-white text-sm font-medium rounded-lg border border-gray-600 hover:border-gray-500"
            aria-label="Remove from list"
          >
            Remove from list
          </button>
        </td>
      </tr>
    );
  }

  const isMine = offerData.from.toLowerCase() === myAddress.toLowerCase();
  if (!isMine) return null;

  const isCanceling = cancelingOfferHash?.toLowerCase() === offerHash.toLowerCase();
  const shortHash = `${offerHash.slice(0, 10)}…${offerHash.slice(-8)}`;

  return (
    <>
      <tr className="border-b border-gray-700/50 hover:bg-[#2D2438]/30">
        <td className="py-3 pr-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCopyOfferId}
                  className="font-mono text-gray-400 hover:text-white text-xs inline-flex items-center gap-1.5"
                  aria-label="Copy offer ID"
                >
                  {shortHash}
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#2D2438] border-gray-600 text-gray-200">
                Copy offer ID
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>
        <td className="py-3 pr-4 text-white">{TIER_LABELS[Number(offerData.tier)] ?? `Tier ${offerData.tier}`}</td>
        <td className="py-3 pr-4 font-mono text-gray-300 text-xs">{`${offerData.to.slice(0, 6)}...${offerData.to.slice(-4)}`}</td>
        <td className="py-3 pr-4 text-white">{offerData.amount.toString()} licenses</td>
        <td className="py-3 pr-4">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">Pending</span>
        </td>
        <td className="py-3 text-right">
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isCanceling}
            className="px-4 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
            aria-label="Cancel this delegation offer"
          >
            {isCanceling && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {isCanceling ? 'Cancelling…' : 'Cancel & withdraw'}
          </button>
        </td>
      </tr>
      <AlertDialog open={confirmCancelHash === offerHash} onOpenChange={(open: boolean) => !open && handleDismissConfirm()}>
        <AlertDialogContent className="bg-[#1A1525] border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel delegation offer?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              The recipient will no longer be able to accept this offer. This action cancels the offer and withdraws the
              licenses back to your wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={handleDismissConfirm} className="border-gray-600 text-gray-300 hover:bg-[#2D2438]">
              Keep offer
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCanceling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCanceling ? 'Cancelling…' : 'Yes, cancel & withdraw'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
