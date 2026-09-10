'use client';

import { useState, useMemo } from 'react';
import { type Address } from 'viem';
import { useAccount } from 'wagmi';
import type { Hex } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useStakingDelegation } from '@/hooks/use-staking-delegation';
import { useLicenseBalance } from '@/hooks/use-license-balance';
import { useDelegationOffers } from '@/hooks/use-delegation-offers';
import { ActiveDelegationsSection } from './ActiveDelegationsSection';
import { PendingDelegationOffersSection } from './PendingDelegationOffersSection';
import { CreateOfferForm } from './CreateOfferForm';

export function StakeAndDelegate() {
  const { address } = useAccount();
  const { toast } = useToast();

  const [undelegatingKey, setUndelegatingKey] = useState<string | null>(null);
  const [cancelingOfferHash, setCancelingOfferHash] = useState<Hex | null>(null);

  const {
    undelegateAndWithdraw,
    refetch: refetchDelegations,
  } = useStakingDelegation();
  const {
    createdOffers,
    cancelOfferAndWithdraw,
    refetch: refetchOffers,
    isLoading: isOffersLoading,
  } = useDelegationOffers();
  const { refetch: refetchLicenseBalance } = useLicenseBalance();

  const createdOfferHashes = useMemo(
    () => createdOffers.map((o) => o.offerHash as Hex),
    [createdOffers],
  );

  const isNotConnected = !address;

  const handleCancelOffer = async (offerHash: Hex) => {
    setCancelingOfferHash(offerHash);
    try {
      await cancelOfferAndWithdraw(offerHash as `0x${string}`);
      toast({
        title: 'Offer cancelled',
        description: 'Offer cancelled and licenses withdrawn back to your wallet.',
      });
      refetchLicenseBalance();
      refetchOffers();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Cancel & withdraw failed',
        variant: 'destructive',
      });
    } finally {
      setCancelingOfferHash(null);
    }
  };

  const handleUndelegate = async (t: number, node: Address, amt: bigint) => {
    const key = `${t}-${node}`;
    setUndelegatingKey(key);
    try {
      await undelegateAndWithdraw({ tier: t, nodeAddress: node, amount: amt });
      toast({ title: 'Success!', description: 'Licenses undelegated and withdrawn.' });
      refetchDelegations();
      refetchLicenseBalance();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Undelegate failed',
        variant: 'destructive',
      });
    } finally {
      setUndelegatingKey(null);
    }
  };

  if (isNotConnected) {
    return (
      <div className="p-6 bg-[#1A1525] border border-gray-700 rounded-lg text-center">
        <p className="text-gray-400 mb-2">Connect your wallet to deposit, delegate, and manage licenses.</p>
        <p className="text-sm text-gray-500">Use the Connect Wallet button in the top right.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ActiveDelegationsSection
        staker={address as Address}
        onUndelegate={handleUndelegate}
        undelegatingKey={undelegatingKey}
        onRefreshClick={refetchDelegations}
      />

      <PendingDelegationOffersSection
        myAddress={address as Address}
        offerHashes={createdOfferHashes}
        onRemoveHash={() => refetchOffers()}
        onCancelOffer={handleCancelOffer}
        cancelingOfferHash={cancelingOfferHash}
        loaded={!isOffersLoading}
      />

      <CreateOfferForm />
    </div>
  );
}
