// config.ts (new file)
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mawariTestnet, mawariMainnet } from '@/config/chains';
import { IS_TESTNET } from '@/lib/constant';

// Create config only once to prevent multiple initializations
let wagmiConfigInstance: any = null;

function createWagmiConfig() {
  if (!wagmiConfigInstance) {
    wagmiConfigInstance = getDefaultConfig({
      appName: "NASS Tool",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "dummy",
      chains: IS_TESTNET ? [mawariTestnet] : [mawariMainnet],
      ssr: false,
    });
  }
  return wagmiConfigInstance;
}

export const wagmiConfig = createWagmiConfig();
