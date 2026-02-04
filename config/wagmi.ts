import type { AppKitNetwork } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { mawariTestnet, mawariMainnet } from '@/config/chains';
import { IS_TESTNET } from '@/lib/constant';

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('NEXT_PUBLIC_PROJECT_ID or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect may not work.');
}

export const metadata = {
  name: 'NASS Tool',
  description: 'Mawari License Staking & Delegation',
  url: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://mawari.net',
  icons: [],
};

const chains = IS_TESTNET ? [mawariTestnet] : [mawariMainnet];
export const networks = chains as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: projectId || 'dummy',
  ssr: true,
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: 'NASS Tool' }),
  ],
});

export const featuredWalletIds = (
  process.env.NEXT_PUBLIC_INCLUDE_WALLET_IDS || ''
)
  .split(',')
  .filter((id) => id.trim())
  .map((id) => id.trim());
