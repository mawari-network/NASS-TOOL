import { Address } from "viem";

export const IS_TESTNET = true;
export const IS_LOCAL = true;
export const wcProjectId = process.env.WC_PROJECT_ID;

export const EXPLORER_URL = IS_TESTNET
  ? "https://explorer.testnet.mawari.net/tx/"
  : "https://mainnet.explorer.com";


type ContractKeys =
  | "LICENSE_1155"
  | "LICENSE_ESCROW"
  | "DELEGATION"
  | "REWARDS_EPOCH_CONFIG"
  | "ORACLE"
  | "MAWARI_TOKEN";

// Mawari testnet - latest deployment (Chain ID: 576)
export const CONTRACT: Record<ContractKeys, Address> = {
  LICENSE_1155: (process.env.NEXT_PUBLIC_LICENSE_ADDRESS || "0x9cA9D4B531EDc11b307161Ef1E36aF06C47DeDB8") as Address,
  LICENSE_ESCROW: (process.env.NEXT_PUBLIC_LICENSE_ESCROW_ADDRESS || "0x46ca8c2261cab271c27ee6BaD36bE7D87cd708F7") as Address,
  DELEGATION: (process.env.NEXT_PUBLIC_DELEGATION_ADDRESS || "0x60A0Ae8cE7e43fD1cD721640eabf4a421233045a") as Address,
  REWARDS_EPOCH_CONFIG: (process.env.NEXT_PUBLIC_REWARDS_ADDRESS || "0xAA759249779c7A5903318C106126F096A8966f6d") as Address,
  ORACLE: (process.env.NEXT_PUBLIC_ORACLE_ADDRESS || "0xDD07b108b9d1c1A133345e83F5C8d25dbBEA9963") as Address,
  MAWARI_TOKEN: (process.env.NEXT_PUBLIC_MAWARI_TOKEN_ADDRESS || "0x33Da67Cbf0E909637Ac93e52c8DAce8b018f1ae5") as Address,
};

export const SERVER_URL = IS_LOCAL
  ? "http://localhost:3000"
  : "https://your-production-url.com";

// Import ABIs
import LicenseEscrowABI from './abi/LicenseEscrow.json';
import DelegationABI from './abi/Delegation.json';
import RewardsEpochConfigABI from './abi/RewardsEpochConfig.json';
import License1155ABI from './abi/License1155.json';

export { LicenseEscrowABI, DelegationABI, RewardsEpochConfigABI, License1155ABI };