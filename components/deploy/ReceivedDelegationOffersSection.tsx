'use client';

import { useState } from 'react';
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
import type { DelegationOfferInfo } from '@/hooks/use-delegation-offers';
import { TIER_LABELS } from '@/config/deploy-constants';

export interface ReceivedDelegationOffersSectionProps {
  offers: DelegationOfferInfo[];
  onAcceptOffer: (hash: Hex) => void;
  acceptingOfferHash: Hex | null;
  isLoading: boolean;
}

export function ReceivedDelegationOffersSection({
  offers,
  onAcceptOffer,
  acceptingOfferHash,
  isLoading,
}: ReceivedDelegationOffersSectionProps) {
  return (
    <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Received delegation offers</h3>
      </div>
      {isLoading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading received offers…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Received delegation offers">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 pr-4">Offer ID</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4">From</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                    No received offers. When someone creates a delegation offer for your address, it will appear here.
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <ReceivedOfferRow
                    key={offer.offerHash}
                    offer={offer}
                    onAcceptOffer={onAcceptOffer}
                    acceptingOfferHash={acceptingOfferHash}
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

function ReceivedOfferRow({
  offer,
  onAcceptOffer,
  acceptingOfferHash,
}: {
  offer: DelegationOfferInfo;
  onAcceptOffer: (hash: Hex) => void;
  acceptingOfferHash: Hex | null;
}) {
  const { toast } = useToast();
  const [confirmAcceptHash, setConfirmAcceptHash] = useState<Hex | null>(null);

  const isAccepting = acceptingOfferHash?.toLowerCase() === offer.offerHash.toLowerCase();
  const shortHash = `${offer.offerHash.slice(0, 10)}…${offer.offerHash.slice(-8)}`;

  const handleCopyOfferId = () => {
    if (typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(offer.offerHash);
      toast({ title: 'Offer ID copied', description: 'Pasted to clipboard.' });
    }
  };

  const handleAcceptClick = () => setConfirmAcceptHash(offer.offerHash as Hex);
  const handleConfirmAccept = () => {
    if (confirmAcceptHash) {
      onAcceptOffer(confirmAcceptHash);
      setConfirmAcceptHash(null);
    }
  };
  const handleDismissConfirm = () => setConfirmAcceptHash(null);

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
        <td className="py-3 pr-4 text-white">
          {TIER_LABELS[offer.tier] ?? `Tier ${offer.tier}`}
        </td>
        <td className="py-3 pr-4 font-mono text-gray-300 text-xs">
          {`${offer.from.slice(0, 6)}...${offer.from.slice(-4)}`}
        </td>
        <td className="py-3 pr-4 text-white">{offer.amount.toString()} licenses</td>
        <td className="py-3 pr-4">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
            Awaiting
          </span>
        </td>
        <td className="py-3 text-right">
          <button
            type="button"
            onClick={handleAcceptClick}
            disabled={isAccepting}
            className="px-4 py-1.5 bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
            aria-label="Accept this delegation offer"
          >
            {isAccepting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {isAccepting ? 'Accepting…' : 'Accept'}
          </button>
        </td>
      </tr>
      <AlertDialog
        open={confirmAcceptHash === (offer.offerHash as Hex)}
        onOpenChange={(open: boolean) => !open && handleDismissConfirm()}
      >
        <AlertDialogContent className="bg-[#1A1525] border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Accept delegation offer?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Accepting this offer will delegate {offer.amount.toString()} Tier {offer.tier} license(s) from{' '}
              <span className="font-mono text-gray-300">{`${offer.from.slice(0, 6)}...${offer.from.slice(-4)}`}</span>{' '}
              to your node. The delegation will become active in the next epoch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={handleDismissConfirm}
              className="border-gray-600 text-gray-300 hover:bg-[#2D2438]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAccept}
              disabled={isAccepting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isAccepting ? 'Accepting…' : 'Yes, accept offer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
