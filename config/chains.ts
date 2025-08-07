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