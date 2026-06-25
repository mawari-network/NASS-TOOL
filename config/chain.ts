import type { Chain } from 'viem';
import {
  mawariMainnet,
  MAINNET_CONTRACTS,
  EXPLORER_URL as MAINNET_EXPLORER_URL,
} from './mainnet';
import {
  mawariTestnet,
  TESTNET_CONTRACTS,
  EXPLORER_URL as TESTNET_EXPLORER_URL,
} from './testnet';

export type NetworkEnv = 'mainnet' | 'testnet';

function resolveNetwork(): NetworkEnv {
  const network = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase();
  if (network === 'testnet') return 'testnet';
  if (network === 'mainnet') return 'mainnet';

  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
  if (chainId === mawariTestnet.id) return 'testnet';
  if (chainId === mawariMainnet.id) return 'mainnet';

  return 'testnet';
}

/** Active deployment target (mainnet or testnet). Set via NEXT_PUBLIC_NETWORK. */
export const NETWORK = resolveNetwork();
export const isTestnet = NETWORK === 'testnet';

/** Active chain definition for the configured network. */
export const mawariChain = isTestnet ? mawariTestnet : mawariMainnet;
export const CHAIN_ID = mawariChain.id;

/** Contract addresses for the active network. */
export const CHAIN_CONTRACTS = isTestnet ? TESTNET_CONTRACTS : MAINNET_CONTRACTS;

/** Transaction explorer base URL for the active network. */
export const EXPLORER_URL = isTestnet ? TESTNET_EXPLORER_URL : MAINNET_EXPLORER_URL;

/** Both Mawari chains — active network first (AppKit / wagmi default). */
export const mawariNetworks: readonly [Chain, ...Chain[]] = isTestnet
  ? [mawariTestnet, mawariMainnet]
  : [mawariMainnet, mawariTestnet];

export { mawariMainnet, mawariTestnet, MAINNET_CONTRACTS, TESTNET_CONTRACTS };
