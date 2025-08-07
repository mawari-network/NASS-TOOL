import { Wallet } from "./wallet";

export interface License {
  tokenId: string;
  status: 'available' | 'delegated' | 'expired';
  expiryDate?: string;
}

export interface WalletWithLicenses extends Wallet {
  licenses: License[];
  loading: boolean;
  error?: string;
}

