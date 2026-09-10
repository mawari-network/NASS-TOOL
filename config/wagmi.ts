import type { AppKitNetwork } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { mawariNetworks } from '@/config/chain';

export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ||
  '';

export const hasProjectId = Boolean(projectId);

if (!projectId) {
  console.warn(
    'WalletConnect projectId is not set. Set NEXT_PUBLIC_PROJECT_ID (or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID / NEXT_PUBLIC_WC_PROJECT_ID). Connect Wallet will not work until then.'
  );
}

export const metadata = {
  name: 'NASS Tool',
  description: 'Mawari License Staking & Delegation',
  url: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://mawari.net',
  icons: [],
};

export const networks = mawariNetworks as unknown as [AppKitNetwork, ...AppKitNetwork[]];

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
