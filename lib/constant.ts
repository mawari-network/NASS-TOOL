import type { Address } from 'viem';
import { CHAIN_CONTRACTS, EXPLORER_URL } from '@/config/chain';
import DelegationABI from './abi/Delegation.json';
import License1155ABI from './abi/License1155.json';

export { EXPLORER_URL };

export const CONTRACT: Record<'LICENSE_1155' | 'LICENSE_ESCROW' | 'DELEGATION', Address> = {
  LICENSE_1155: CHAIN_CONTRACTS.LICENSE_1155,
  LICENSE_ESCROW: CHAIN_CONTRACTS.LICENSE_ESCROW,
  DELEGATION: CHAIN_CONTRACTS.DELEGATION,
};

export { DelegationABI, License1155ABI };
