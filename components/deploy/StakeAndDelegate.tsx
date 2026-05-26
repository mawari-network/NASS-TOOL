'use client';

import { useState, useMemo } from 'react';
import { type Address, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import type { Hex } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useStakingDelegation } from '@/hooks/use-staking-delegation';
import { useLicenseBalance } from '@/hooks/use-license-balance';
import { useDelegationOffers } from '@/hooks/use-delegation-offers';
import { ActiveDelegationsSection } from './ActiveDelegationsSection';
import { PendingDelegationOffersSection } from './PendingDelegationOffersSection';
import { OfferDelegationForm } from './OfferDelegationForm';

export function StakeAndDelegate() {
  const { address } = useAccount();
  const { toast } = useToast();

  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [undelegatingKey, setUndelegatingKey] = useState<string | null>(null);
  const [offerToAddress, setOfferToAddress] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [cancelingOfferHash, setCancelingOfferHash] = useState<Hex | null>(null);
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);

  const {
    undelegateAndWithdraw,
    refetch: refetchDelegations,
  } = useStakingDelegation();
  const {
    createdOffers,
    createOffer,
    cancelOfferAndWithdraw,
    refetch: refetchOffers,
    isLoading: isOffersLoading,
  } = useDelegationOffers();
  const { getBalanceForTier, isLoading: isBalanceLoading, refetch: refetchLicenseBalance } = useLicenseBalance();

  const createdOfferHashes = useMemo(
    () => createdOffers.map((o) => o.offerHash as Hex),
    [createdOffers],
  );

  const isNotConnected = !address;
  const isValidOfferTo = useMemo(() => isAddress(offerToAddress), [offerToAddress]);
  const isValidOfferAmount = useMemo(() => Number(offerAmount) > 0, [offerAmount]);

  const handleCreateOffer = async () => {
    if (!address || !isValidOfferTo || !isValidOfferAmount) return;
    setIsCreatingOffer(true);
    try {
      await createOffer(offerToAddress as Address, tier, BigInt(offerAmount));
      setOfferToAddress('');
      setOfferAmount('');
      toast({ title: 'Offer created', description: 'Recipient can accept the delegation offer.' });
      refetchLicenseBalance();
      refetchOffers();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Create offer failed',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingOffer(false);
    }
  };

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

      <OfferDelegationForm
        tier={tier}
        setTier={setTier}
        offerToAddress={offerToAddress}
        setOfferToAddress={setOfferToAddress}
        offerAmount={offerAmount}
        setOfferAmount={setOfferAmount}
        isValidOfferTo={isValidOfferTo}
        isValidOfferAmount={isValidOfferAmount}
        isDepositing={isCreatingOffer}
        getBalanceForTier={getBalanceForTier}
        isBalanceLoading={isBalanceLoading}
        onCreateOffer={handleCreateOffer}
      />
    </div>
  );
}
