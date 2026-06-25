'use client';

import { type Address } from 'viem';
import { useAccount } from 'wagmi';
import { CONTRACT } from '@/lib/constant';
import { useApproval } from './use-approval';
import { useLicenseBalance } from './use-license-balance';

/**
 * License balances + escrow approval for batch offer flows.
 * batchDepositAndOfferDelegation pulls licenses via escrow — approval required.
 */
export function useLicense() {
  const { address } = useAccount();
  const { balances, isLoading: isBalanceLoading, refetch: refetchBalances } = useLicenseBalance();
  const approval = useApproval({
    owner: address as Address,
    operator: CONTRACT.LICENSE_ESCROW as Address,
    enabled: !!address,
  });

  const refetch = () => {
    refetchBalances();
    approval.refetchApproval();
  };

  return {
    balances,
    isLoading: isBalanceLoading || approval.isLoading,
    isApprovedForDelegation: approval.isApproved === true,
    approve: approval.approve,
    isApproving: approval.isTransactionPending,
    refetch,
  };
}
