import type { Address, Chain } from 'viem';

export const CHAIN_ID = 1576;

const MAINNET_RPC =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://rpc.mawari.net/http';

const MAINNET_EXPLORER =
  process.env.NEXT_PUBLIC_MAINNET_EXPLORER_URL ||
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  'https://explorer.mawari.net';

export const mawariMainnet = {
  id: CHAIN_ID,
  name: 'Mawari Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MAWARI',
    symbol: 'MAWARI',
  },
  rpcUrls: {
    public: {
      http: [MAINNET_RPC],
    },
    default: {
      http: [MAINNET_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mawari Explorer',
      url: MAINNET_EXPLORER,
    },
  },
  testnet: false,
} as const satisfies Chain;

export const MAINNET_CONTRACTS = {
  LICENSE_1155: (process.env.NEXT_PUBLIC_LICENSE_ADDRESS ||
    '0x127E39Dcd8829588D4C7f13F1f4cC5eaE2020Eac') as Address,
  LICENSE_ESCROW: (process.env.NEXT_PUBLIC_LICENSE_ESCROW_ADDRESS ||
    '0x87efe61bF8445453a4D967732abe643E483E5ace') as Address,
  DELEGATION: (process.env.NEXT_PUBLIC_DELEGATION_ADDRESS ||
    '0x66182dBe9c547CC7e8F4bB6EAf0431242695cbCf') as Address,
} as const;

export const EXPLORER_URL = `${MAINNET_EXPLORER}/tx/`;
