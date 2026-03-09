'use client';

import { useState, useMemo } from 'react';
import { type Address, isAddress } from 'viem';
import { useAccount, useWatchContractEvent } from 'wagmi';
import type { Hex } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useStakingDelegation } from '@/hooks/use-staking-delegation';
import { useEscrowApproval } from '@/hooks/use-escrow';
import { useLicenseBalance } from '@/hooks/use-license-balance';
import { usePendingOfferHashes } from '@/hooks/use-delegation-offers';
import { CONTRACT, DelegationABI } from '@/lib/constant';
import { ActiveDelegationsSection } from './ActiveDelegationsSection';
import { PendingDelegationOffersSection } from './PendingDelegationOffersSection';
import { OfferDelegationForm } from './OfferDelegationForm';
import { ApproveEscrowCard } from './ApproveEscrowCard';

export function StakeAndDelegate() {
  const { address } = useAccount();
  const { toast } = useToast();

  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [undelegatingKey, setUndelegatingKey] = useState<string | null>(null);
  const [offerToAddress, setOfferToAddress] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [cancelingOfferHash, setCancelingOfferHash] = useState<Hex | null>(null);

  const { isApproved: isEscrowApproved, approve: approveEscrow, isTransactionPending: isApproving } =
    useEscrowApproval(address as Address);
  const {
    undelegateAndWithdraw,
    depositAndOfferDelegation,
    cancelOfferAndWithdraw,
    refetch: refetchDelegations,
    isLoading: isDepositing,
  } = useStakingDelegation();
  const { getBalanceForTier, isLoading: isBalanceLoading, refetch: refetchLicenseBalance } = useLicenseBalance();
  const {
    hashes: pendingOfferHashes,
    addHash: addPendingOfferHash,
    removeHash: removePendingOfferHash,
    loaded: pendingHashesLoaded,
  } = usePendingOfferHashes(address as Address);

  useWatchContractEvent({
    address: CONTRACT.DELEGATION as Address,
    abi: DelegationABI,
    eventName: 'DelegationOfferAccepted',
    poll: true,
    pollingInterval: 2_000,
    onLogs(logs) {
      logs.forEach((log) => {
        const hash = log.topics?.[1] as Hex | undefined;
        if (hash) {
          removePendingOfferHash(hash);
          refetchDelegations();
        }
      });
    },
  });
  useWatchContractEvent({
    address: CONTRACT.DELEGATION as Address,
    abi: DelegationABI,
    eventName: 'DelegationOfferCancelled',
    poll: true,
    pollingInterval: 2_000,
    onLogs(logs) {
      logs.forEach((log) => {
        const hash = log.topics?.[1] as Hex | undefined;
        if (hash) {
          removePendingOfferHash(hash);
          refetchDelegations();
        }
      });
    },
  });

  const isNotConnected = !address;
  const isValidOfferTo = useMemo(() => isAddress(offerToAddress), [offerToAddress]);
  const isValidOfferAmount = useMemo(() => Number(offerAmount) > 0, [offerAmount]);

  const handleApprove = async () => {
    try {
      await approveEscrow();
      toast({
        title: 'Approved!',
        description: 'You can now create delegation offers and delegate licenses.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Approval failed',
        variant: 'destructive',
      });
    }
  };

  const handleCreateOffer = async () => {
    if (!address || !isValidOfferTo || !isValidOfferAmount) return;
    try {
      const { offerHash } = await depositAndOfferDelegation({
        to: offerToAddress as Address,
        tier,
        amount: BigInt(offerAmount),
      });
      addPendingOfferHash(offerHash);
      setOfferToAddress('');
      setOfferAmount('');
      toast({ title: 'Offer created', description: 'Recipient can accept the delegation offer.' });
      refetchLicenseBalance();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Create offer failed',
        variant: 'destructive',
      });
    }
  };

  const handleCancelOffer = async (offerHash: Hex) => {
    setCancelingOfferHash(offerHash);
    try {
      await cancelOfferAndWithdraw(offerHash);
      removePendingOfferHash(offerHash);
      toast({
        title: 'Offer cancelled',
        description: 'Offer cancelled and licenses withdrawn back to your wallet.',
      });
      refetchLicenseBalance();
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
        offerHashes={pendingOfferHashes}
        onRemoveHash={removePendingOfferHash}
        onCancelOffer={handleCancelOffer}
        cancelingOfferHash={cancelingOfferHash}
        loaded={pendingHashesLoaded}
      />

      {!isEscrowApproved && <ApproveEscrowCard onApprove={handleApprove} isApproving={isApproving} />}

      {isEscrowApproved && (
        <OfferDelegationForm
          tier={tier}
          setTier={setTier}
          offerToAddress={offerToAddress}
          setOfferToAddress={setOfferToAddress}
          offerAmount={offerAmount}
          setOfferAmount={setOfferAmount}
          isValidOfferTo={isValidOfferTo}
          isValidOfferAmount={isValidOfferAmount}
          isDepositing={isDepositing}
          getBalanceForTier={getBalanceForTier}
          isBalanceLoading={isBalanceLoading}
          onCreateOffer={handleCreateOffer}
        />
      )}
    </div>
  );
}
