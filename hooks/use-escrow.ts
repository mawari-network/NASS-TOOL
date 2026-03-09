'use client';

import { type Address } from 'viem';
import { useAccount } from 'wagmi';
import { CONTRACT } from '@/lib/constant';
import { useApproval } from './use-approval';

/**
 * Hook to check if user has approval for LicenseEscrow.
 * Wrapper around useApproval(owner, operator) for the escrow contract.
 */
export function useEscrowApproval(userAddress?: Address) {
  const { address: connectedAddress } = useAccount();
  const effectiveAddress = userAddress || connectedAddress;
  const escrowAddress = CONTRACT.LICENSE_ESCROW as Address;

  const approval = useApproval({
    owner: effectiveAddress,
    operator: escrowAddress,
    enabled: !!effectiveAddress,
  });

  return approval;
}
