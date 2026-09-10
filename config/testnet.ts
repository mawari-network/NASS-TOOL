import type { Address, Chain } from 'viem';

export const CHAIN_ID = 576;

const TESTNET_RPC =
  process.env.NEXT_PUBLIC_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://rpc.testnet.mawari.net/http';

const TESTNET_EXPLORER =
  process.env.NEXT_PUBLIC_TESTNET_EXPLORER_URL ||
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  'https://explorer.testnet.mawari.net';

export const mawariTestnet = {
  id: CHAIN_ID,
  name: 'Mawari Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Mawari Test Token',
    symbol: 'MAWARI',
  },
  rpcUrls: {
    public: {
      http: [TESTNET_RPC],
    },
    default: {
      http: [TESTNET_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mawari Testnet Explorer',
      url: TESTNET_EXPLORER,
    },
  },
  testnet: true,
} as const satisfies Chain;

export const TESTNET_CONTRACTS = {
  LICENSE_1155: (process.env.NEXT_PUBLIC_LICENSE_ADDRESS ||
    '0x39B189AE8e3188850437AA51999f88D20658C886') as Address,
  LICENSE_ESCROW: (process.env.NEXT_PUBLIC_LICENSE_ESCROW_ADDRESS ||
    '0x30125a7096DBD4b226B21787c9828f211DCA186A') as Address,
  DELEGATION: (process.env.NEXT_PUBLIC_DELEGATION_ADDRESS ||
    '0x213efb7e022e60Cf5895fF9FC04d0E5d16905472') as Address,
} as const;

export const EXPLORER_URL = `${TESTNET_EXPLORER}/tx/`;
