import { Chain } from 'viem';

export const mawariTestnet = {
  id: 576,
  name: 'Mawari Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Mawari Test Token',
    symbol: 'MAWARI',
  },
  rpcUrls: {
    public: { 
      http: ['https://rpc.testnet.mawari.net/http'],
      webSocket: ['wss://rpc.testnet.mawari.net/ws'],
    },
    default: { 
      http: ['https://rpc.testnet.mawari.net/http'],
      webSocket: ['wss://rpc.testnet.mawari.net/ws'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.mawari.net' },
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