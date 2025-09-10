import { Chain } from 'viem';

export const mawariTestnet = {
  id: 629274,
  name: 'Mawari Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MAWARI',
    symbol: 'MAWARI',
  },
  rpcUrls: {
    public: { http: ['https://mawari-network-testnet.rpc.caldera.xyz/http'] },
    default: { http: ['https://mawari-network-testnet.rpc.caldera.xyz/http'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://mawari-network-testnet.rpc.caldera.xyz' },
  },
  contracts: {
    multicall3: {
      address: '0x3F1BD1Abc350eD6313Ff7Eaab561DCAbbcc61071' as `0x${string}`,
      blockCreated: 1,
    },
  },
  testnet: true,
} as const satisfies Chain;

export const mawariMainnet = {
  id: 629275, // Placeholder ID - update with actual mainnet ID
  name: 'Mawari Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MAWARI',
    symbol: 'MAWARI',
  },
  rpcUrls: {
    public: { http: ['https://mawari-network-mainnet.rpc.caldera.xyz/http'] }, // Placeholder URL
    default: { http: ['https://mawari-network-mainnet.rpc.caldera.xyz/http'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://mawari-network-mainnet.rpc.caldera.xyz' }, // Placeholder URL
  },
  contracts: {
    multicall3: {
      address: '0x3F1BD1Abc350eD6313Ff7Eaab561DCAbbcc61071' as `0x${string}`, // Placeholder address
      blockCreated: 1,
    },
  },
  testnet: false,
} as const satisfies Chain;