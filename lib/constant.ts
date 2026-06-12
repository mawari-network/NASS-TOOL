import type { Address } from 'viem';
import { MAINNET_CONTRACTS, EXPLORER_URL } from '@/config/mainnet';
import DelegationABI from './abi/Delegation.json';
import License1155ABI from './abi/License1155.json';

export { EXPLORER_URL };

export const CONTRACT: Record<'LICENSE_1155' | 'DELEGATION', Address> = {
  LICENSE_1155: MAINNET_CONTRACTS.LICENSE_1155,
  DELEGATION: MAINNET_CONTRACTS.DELEGATION,
};

export { DelegationABI, License1155ABI };
