'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type Address, type Hex, parseAbiItem, encodeAbiParameters, type PublicClient } from 'viem';
import { useAccount, usePublicClient, useReadContract, useWalletClient } from 'wagmi';
import { CONTRACT, DelegationABI, License1155ABI } from '@/lib/constant';
import { mawariChain } from '@/config/chain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = 'nass_pending_offer_hashes_';
const OFFER_SCAN_BLOCKS = 100_000n;

const OFFER_GONE_SELECTORS = ['0x6df5846d', '0x9b0104d6', '0x66e5a2c0'] as const;

export interface DelegationOfferData {
  from: Address;
  to: Address;
  tier: bigint;
  amount: bigint;
  isActive: boolean;
}

export interface DelegationOfferInfo {
  offerHash: `0x${string}`;
  from: Address;
  to: Address;
  tier: number;
  amount: bigint;
  isActive: boolean;
}

export interface BatchOfferParam {
  to: Address;
  tier: number;
  amount: number;
}

interface ContractOffer {
  from: Address;
  to: Address;
  tier: bigint;
  amount: bigint;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isOfferGoneError(error: unknown): boolean {
  if (error == null) return false;
  const msg = error instanceof Error ? error.message : String(error);
  if (!msg) return false;
  const byName = /OfferNotFound|OfferNotActive|InvalidOfferHash/i.test(msg);
  const bySelector = OFFER_GONE_SELECTORS.some((sel) => msg.includes(sel));
  return byName || bySelector;
}

async function revalidateDelegationUi(
  queryClient: ReturnType<typeof useQueryClient>,
  address: Address,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['delegationOffers', address] }),
    queryClient.invalidateQueries({ queryKey: ['delegationStakes', address] }),
    queryClient.invalidateQueries({ queryKey: ['licenseBalances', address] }),
  ]);
}

// ---------------------------------------------------------------------------
// Event-based offer scanner
// ---------------------------------------------------------------------------

async function fetchOffers(
  address: Address,
  publicClient: PublicClient,
): Promise<{ created: DelegationOfferInfo[]; received: DelegationOfferInfo[] }> {
  if (!publicClient) return { created: [], received: [] };

  const blockNumber = await publicClient.getBlockNumber();
  const fromBlock = blockNumber > OFFER_SCAN_BLOCKS ? blockNumber - OFFER_SCAN_BLOCKS : 0n;

  const createdEvent = parseAbiItem(
    'event DelegationOfferCreated(bytes32 indexed offerHash, address indexed from, address indexed to, uint256 tier, uint256 amount)',
  );
  const acceptedEvent = parseAbiItem(
    'event DelegationOfferAccepted(bytes32 indexed offerHash, address indexed from, address indexed to, uint256 tier, uint256 amount)',
  );
  const cancelledEvent = parseAbiItem(
    'event DelegationOfferCancelled(bytes32 indexed offerHash, address indexed from, address indexed to, uint256 tier, uint256 amount)',
  );

  const delegationAddr = CONTRACT.DELEGATION as Address;

  const [createdByMe, createdForMe, acceptedLogs, cancelledLogs] = await Promise.all([
    publicClient.getLogs({
      address: delegationAddr,
      event: createdEvent,
      args: { from: address },
      fromBlock,
      toBlock: 'latest',
    }),
    publicClient.getLogs({
      address: delegationAddr,
      event: createdEvent,
      args: { to: address },
      fromBlock,
      toBlock: 'latest',
    }),
    publicClient.getLogs({
      address: delegationAddr,
      event: acceptedEvent,
      fromBlock,
      toBlock: 'latest',
    }),
    publicClient.getLogs({
      address: delegationAddr,
      event: cancelledEvent,
      fromBlock,
      toBlock: 'latest',
    }),
  ]);

  type EventEntry = {
    type: 'created' | 'resolved';
    hash: string;
    blockNumber: bigint;
    from: Address;
    to: Address;
    tier: bigint;
    amount: bigint;
  };

  const allEvents: EventEntry[] = [];

  for (const log of [...createdByMe, ...createdForMe]) {
    if (log.args.offerHash) {
      allEvents.push({
        type: 'created',
        hash: log.args.offerHash,
        blockNumber: log.blockNumber,
        from: log.args.from!,
        to: log.args.to!,
        tier: log.args.tier!,
        amount: log.args.amount!,
      });
    }
  }

  for (const log of [...acceptedLogs, ...cancelledLogs]) {
    if (log.args.offerHash) {
      allEvents.push({
        type: 'resolved',
        hash: log.args.offerHash,
        blockNumber: log.blockNumber,
        from: log.args.from!,
        to: log.args.to!,
        tier: log.args.tier!,
        amount: log.args.amount!,
      });
    }
  }

  allEvents.sort((a, b) => Number(a.blockNumber - b.blockNumber));

  const latestByHash = new Map<string, EventEntry>();
  for (const event of allEvents) {
    latestByHash.set(event.hash, event);
  }

  const candidateHashes = new Map<
    string,
    { from: Address; to: Address; tier: bigint; amount: bigint }
  >();
  for (const [hash, event] of latestByHash) {
    if (event.type === 'created') {
      candidateHashes.set(hash, {
        from: event.from,
        to: event.to,
        tier: event.tier,
        amount: event.amount,
      });
    }
  }

  const created: DelegationOfferInfo[] = [];
  const received: DelegationOfferInfo[] = [];

  for (const [hash, info] of candidateHashes) {
    try {
      const offer = (await publicClient.readContract({
        address: delegationAddr,
        abi: DelegationABI,
        functionName: 'getDelegationOffer',
        args: [hash as `0x${string}`],
      })) as ContractOffer;

      if (!offer.isActive) continue;

      const offerInfo: DelegationOfferInfo = {
        offerHash: hash as `0x${string}`,
        from: offer.from,
        to: offer.to,
        tier: Number(offer.tier),
        amount: offer.amount,
        isActive: true,
      };

      if (info.from.toLowerCase() === address.toLowerCase()) {
        created.push(offerInfo);
      }
      if (info.to.toLowerCase() === address.toLowerCase()) {
        received.push(offerInfo);
      }
    } catch {
      // offer deleted or reverted — skip
    }
  }

  return { created, received };
}

// ---------------------------------------------------------------------------
// useDelegationOffers — full offer lifecycle hook (no dashboard client)
// ---------------------------------------------------------------------------

export function useDelegationOffers() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: mawariChain.id });
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    refetch: refetchOffers,
  } = useQuery({
    queryKey: ['delegationOffers', address],
    queryFn: () => fetchOffers(address!, publicClient!),
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    refetchInterval: 12_000,
    enabled: !!address && !!publicClient,
  });

  // --- mutations ---

  const createOffer = useCallback(
    async (
      to: Address,
      tier: number,
      amount: bigint,
    ): Promise<{ txHash: Hex; offerHash: `0x${string}` }> => {
      if (!address) throw new Error('Wallet not connected');
      if (!walletClient) throw new Error('Wallet client not available');
      if (!publicClient) throw new Error('Public client not available');

      const data = encodeAbiParameters(
        [{ type: 'address' }],
        [to],
      );

      const txHash = await walletClient.writeContract({
        address: CONTRACT.LICENSE_1155 as Address,
        abi: License1155ABI,
        functionName: 'safeTransferFrom',
        args: [address, CONTRACT.DELEGATION as Address, BigInt(tier), amount, data],
        account: address,
        chain: mawariChain,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      let offerHash: `0x${string}` = '0x';
      const delegationAddrLower = (CONTRACT.DELEGATION as string).toLowerCase();
      for (const log of receipt.logs) {
        if (
          log.address.toLowerCase() === delegationAddrLower &&
          log.topics.length >= 4 &&
          log.topics[1]
        ) {
          offerHash = log.topics[1] as `0x${string}`;
          break;
        }
      }

      await revalidateDelegationUi(queryClient, address);

      return { txHash, offerHash };
    },
    [address, walletClient, publicClient, queryClient],
  );

  const batchCreateOffer = useCallback(
    async (
      params: BatchOfferParam[],
    ): Promise<{ txHash: Hex; offerHashes: `0x${string}`[] }> => {
      if (!address) throw new Error('Wallet not connected');
      if (!walletClient) throw new Error('Wallet client not available');
      if (!publicClient) throw new Error('Public client not available');

      const contractParams = params.map((p) => ({
        to: p.to,
        tier: BigInt(p.tier),
        amount: BigInt(p.amount),
      }));

      const { request, result } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'batchDepositAndOfferDelegation',
        args: [contractParams],
        account: address,
      });

      const txHash = (await walletClient.writeContract(request)) as Hex;
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const offerHashes = (result ?? []) as `0x${string}`[];
      await revalidateDelegationUi(queryClient, address);

      return { txHash, offerHashes };
    },
    [address, walletClient, publicClient, queryClient],
  );

  const cancelOffer = useCallback(
    async (offerHash: `0x${string}`): Promise<Hex> => {
      if (!address) throw new Error('Wallet not connected');
      if (!walletClient) throw new Error('Wallet client not available');
      if (!publicClient) throw new Error('Public client not available');

      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'cancelDelegationOffer',
        args: [offerHash],
        account: address,
      });

      const txHash = (await walletClient.writeContract(request)) as Hex;
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await revalidateDelegationUi(queryClient, address);
      return txHash;
    },
    [address, walletClient, publicClient, queryClient],
  );

  const cancelOfferAndWithdraw = useCallback(
    async (offerHash: `0x${string}`): Promise<Hex> => {
      if (!address) throw new Error('Wallet not connected');
      if (!walletClient) throw new Error('Wallet client not available');
      if (!publicClient) throw new Error('Public client not available');

      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'cancelOfferAndWithdraw',
        args: [offerHash],
        account: address,
      });

      const txHash = (await walletClient.writeContract(request)) as Hex;
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await revalidateDelegationUi(queryClient, address);
      return txHash;
    },
    [address, walletClient, publicClient, queryClient],
  );

  const batchCancelOfferAndWithdraw = useCallback(
    async (offerHashes: `0x${string}`[]): Promise<Hex> => {
      if (!address) throw new Error('Wallet not connected');
      if (!walletClient) throw new Error('Wallet client not available');
      if (!publicClient) throw new Error('Public client not available');

      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'batchCancelOfferAndWithdraw',
        args: [offerHashes],
        account: address,
      });

      const txHash = (await walletClient.writeContract(request)) as Hex;
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await revalidateDelegationUi(queryClient, address);
      return txHash;
    },
    [address, walletClient, publicClient, queryClient],
  );

  const reduceOffer = useCallback(
    async (to: Address, tier: number, amount: bigint): Promise<Hex> => {
      if (!address) throw new Error('Wallet not connected');
      if (!walletClient) throw new Error('Wallet client not available');
      if (!publicClient) throw new Error('Public client not available');

      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'reduceOfferDelegation',
        args: [to, BigInt(tier), amount],
        account: address,
      });

      const txHash = (await walletClient.writeContract(request)) as Hex;
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await revalidateDelegationUi(queryClient, address);
      return txHash;
    },
    [address, walletClient, publicClient, queryClient],
  );

  const acceptOffer = useCallback(
    async (offerHash: `0x${string}`): Promise<Hex> => {
      if (!address) throw new Error('Wallet not connected');
      if (!walletClient) throw new Error('Wallet client not available');
      if (!publicClient) throw new Error('Public client not available');

      const { request } = await publicClient.simulateContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'acceptDelegationOffer',
        args: [offerHash],
        account: address,
      });

      const txHash = (await walletClient.writeContract(request)) as Hex;
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await revalidateDelegationUi(queryClient, address);
      return txHash;
    },
    [address, walletClient, publicClient, queryClient],
  );

  const getOffer = useCallback(
    async (offerHash: `0x${string}`): Promise<DelegationOfferInfo> => {
      if (!publicClient) throw new Error('Public client not available');

      const result = (await publicClient.readContract({
        address: CONTRACT.DELEGATION as Address,
        abi: DelegationABI,
        functionName: 'getDelegationOffer',
        args: [offerHash],
      })) as ContractOffer;

      return {
        offerHash,
        from: result.from,
        to: result.to,
        tier: Number(result.tier),
        amount: result.amount,
        isActive: result.isActive,
      };
    },
    [publicClient],
  );

  const refetch = useCallback(async () => {
    await refetchOffers();
  }, [refetchOffers]);

  return {
    createdOffers: data?.created ?? [],
    receivedOffers: data?.received ?? [],
    isLoading,
    createOffer,
    batchCreateOffer,
    cancelOffer,
    cancelOfferAndWithdraw,
    batchCancelOfferAndWithdraw,
    reduceOffer,
    acceptOffer,
    getOffer,
    refetch,
  };
}
// ---------------------------------------------------------------------------
// usePendingOfferHashes — localStorage persistence for immediate display
// ---------------------------------------------------------------------------

export function usePendingOfferHashes(userAddress: Address | undefined) {
  const [hashes, setHashes] = useState<Hex[]>([]);
  const [loaded, setLoaded] = useState(false);

  const storageKey = userAddress
    ? `${STORAGE_KEY_PREFIX}${userAddress.toLowerCase()}`
    : null;

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
    [storageKey],
  );

  const addHash = useCallback(
    (offerHash: Hex) => {
      if (hashes.some((h) => h.toLowerCase() === offerHash.toLowerCase())) return;
      const next = [...hashes, offerHash];
      setHashes(next);
      persist(next);
    },
    [hashes, persist],
  );

  const removeHash = useCallback(
    (offerHash: Hex) => {
      const next = hashes.filter(
        (h) => h.toLowerCase() !== (offerHash as string).toLowerCase(),
      );
      setHashes(next);
      persist(next);
    },
    [hashes, persist],
  );

  return { hashes, addHash, removeHash, loaded };
}

// ---------------------------------------------------------------------------
// useDelegationOffer — read a single offer by hash
// ---------------------------------------------------------------------------

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

