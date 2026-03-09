'use client';

import { useState, useCallback, useEffect } from 'react';
import { type Address, type Hex } from 'viem';
import { useReadContract } from 'wagmi';
import { CONTRACT, DelegationABI } from '@/lib/constant';

const STORAGE_KEY_PREFIX = 'nass_pending_offer_hashes_';

/** Revert selectors when getDelegationOffer is called for a deleted/inactive offer (contract deletes after accept/cancel). */
const OFFER_GONE_SELECTORS = ['0x6df5846d', '0x9b0104d6', '0x66e5a2c0'] as const; // OfferNotFound, OfferNotActive, InvalidOfferHash

/**
 * Returns true if the error indicates the offer no longer exists on-chain
 * (accepted, cancelled, or deleted). Used to auto-remove stale entries from the pending list.
 */
export function isOfferGoneError(error: unknown): boolean {
  if (error == null) return false;
  const msg = error instanceof Error ? error.message : String(error);
  if (!msg) return false;
  const byName = /OfferNotFound|OfferNotActive|InvalidOfferHash/i.test(msg);
  const bySelector = OFFER_GONE_SELECTORS.some((sel) => msg.includes(sel));
  return byName || bySelector;
}

export interface DelegationOfferData {
  from: Address;
  to: Address;
  tier: bigint;
  amount: bigint;
  isActive: boolean;
}

/**
 * Persist pending offer hashes for the connected address (localStorage).
 * Used so "My Pending Offers" survives refresh. Safe in production: we only
 * store offer hashes keyed by address; stale entries are removed when we
 * detect accepted/cancelled offers (chain read + event watchers).
 */
export function usePendingOfferHashes(userAddress: Address | undefined) {
  const [hashes, setHashes] = useState<Hex[]>([]);
  const [loaded, setLoaded] = useState(false);

  const storageKey = userAddress ? `${STORAGE_KEY_PREFIX}${userAddress.toLowerCase()}` : null;

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      setLoaded(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as Hex[]) : [];
      setHashes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHashes([]);
    }
    setLoaded(true);
  }, [storageKey]);

  const persist = useCallback(
    (newHashes: Hex[]) => {
      if (!storageKey || typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(newHashes));
      } catch (e) {
        console.warn('Failed to persist offer hashes', e);
      }
    },
    [storageKey]
  );

  const addHash = useCallback(
    (offerHash: Hex) => {
      const normalized = offerHash as Hex;
      if (hashes.some((h) => h.toLowerCase() === normalized.toLowerCase())) return;
      const next = [...hashes, normalized];
      setHashes(next);
      persist(next);
    },
    [hashes, persist]
  );

  const removeHash = useCallback(
    (offerHash: Hex) => {
      const next = hashes.filter((h) => h.toLowerCase() !== (offerHash as string).toLowerCase());
      setHashes(next);
      persist(next);
    },
    [hashes, persist]
  );

  return { hashes, addHash, removeHash, loaded };
}

/**
 * Read a single delegation offer by hash.
 */
export function useDelegationOffer(offerHash: Hex | undefined, enabled = true) {
  const result = useReadContract({
    address: CONTRACT.DELEGATION as Address,
    abi: DelegationABI,
    functionName: 'getDelegationOffer',
    args: offerHash ? [offerHash] : undefined,
    query: {
      enabled: enabled && !!offerHash,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 2_000,
      refetchIntervalInBackground: true,
    },
  });

  // getDelegationOffer returns a struct (ABI output name "offer") — decoded as object or nested under "offer"
  const raw = result.data;
  const tuple =
    raw == null
      ? null
      : typeof raw === 'object' && 'offer' in raw
        ? (raw as { offer: unknown }).offer
        : raw;
  const offerData: DelegationOfferData | undefined =
    tuple == null
      ? undefined
      : Array.isArray(tuple)
        ? {
            from: tuple[0] as Address,
            to: tuple[1] as Address,
            tier: tuple[2] as bigint,
            amount: tuple[3] as bigint,
            isActive: Boolean(tuple[4]),
          }
        : typeof tuple === 'object' && tuple !== null && 'from' in tuple
          ? {
              from: (tuple as DelegationOfferData).from,
              to: (tuple as DelegationOfferData).to,
              tier: (tuple as DelegationOfferData).tier,
              amount: (tuple as DelegationOfferData).amount,
              isActive: Boolean((tuple as DelegationOfferData).isActive),
            }
          : undefined;

  return {
    ...result,
    offerData,
  };
}
