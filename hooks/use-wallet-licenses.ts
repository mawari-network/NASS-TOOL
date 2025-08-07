'use client';

import { useAccount } from 'wagmi';
import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  http,
  type Address,
} from 'viem';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  RPC_URL,
  LICENSE_CONTRACT_ADDRESS,
  LICENSE_ABI,
  MULTICALL_CONTRACT_ADDRESS,
  MULTICALL_ABI,
} from '@/config/contracts';

import {
  MulticallCall,
  MulticallReturn,
} from '@/types/multicall';

/* ──────────────────────────────────────────────────────────────────── */
/*  Types                                                               */
/* ──────────────────────────────────────────────────────────────────── */
export interface License {
  /** 721 token-ids can exceed JS-safe ints, so keep them as strings */
  tokenId: string;
  selected: boolean;
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Constants                                                           */
/* ──────────────────────────────────────────────────────────────────── */
const BATCH_SIZE         = 400;
const TOKENS_PER_PAGE    = 1_000;

/* ──────────────────────────────────────────────────────────────────── */
/*  Hook                                                                */
/* ──────────────────────────────────────────────────────────────────── */
export function useWalletLicenses() {
  const { address } = useAccount();
  
  const publicClient = useMemo(() => 
    createPublicClient({ transport: http(RPC_URL) }),
    []
  );

  /* ---------------------------------------------------------------- */
  /*  React state                                                     */
  /* ---------------------------------------------------------------- */
  const [licenses,  setLicenses]  = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(false);

  /* balance can be derived from licenses.length after load finishes   */
  const balance = licenses.length;

  /* ---------------------------------------------------------------- */
  /*  Loader (wrapped in useCallback to keep a stable ref)            */
  /* ---------------------------------------------------------------- */
  const loadLicenses = useCallback(async (wallet: Address, page: number = 0) => {
    setIsLoading(true);
    if (page === 0) {
      setLicenses([]);
      setTotalBalance(0);
    }

    try {
      /* 1. balanceOf ------------------------------------------------- */
      const tokenCount = Number(
        await publicClient.readContract({
          address       : LICENSE_CONTRACT_ADDRESS as Address,
          abi           : LICENSE_ABI,
          functionName  : 'balanceOf',
          args          : [wallet],
        }),
      );

      setTotalBalance(tokenCount);

      if (tokenCount === 0) return;

      const startIndex = page * TOKENS_PER_PAGE;
      const endIndex = Math.min(startIndex + TOKENS_PER_PAGE, tokenCount);
      const tokensToLoad = endIndex - startIndex;

      if (startIndex >= tokenCount) {
        setHasMorePages(false);
        return;
      }

      const tokenIds = await fetchTokenIds(wallet, tokensToLoad, startIndex);

      const newLicenses = tokenIds.map((id) => ({
        tokenId : id.toString(),
        selected: false,
      }));

      if (page === 0) {
        setLicenses(newLicenses);
      } else {
        setLicenses(prev => [...prev, ...newLicenses]);
      }

      setHasMorePages(endIndex < tokenCount);
      setCurrentPage(page);

    } catch (err) {
      console.error('loadLicenses error', err);
      if (page === 0) {
        setLicenses([]);
        setTotalBalance(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  /* ---------------------------------------------------------------- */
  /*  React effect — reload on wallet / client change                 */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!address || !publicClient) {
      setLicenses([]);
      setTotalBalance(0);
      setCurrentPage(0);
      setHasMorePages(false);
      setIsLoading(false);
      return;
    }
    loadLicenses(address as Address, 0);
  }, [address, publicClient, loadLicenses]);

  const loadMoreLicenses = useCallback(() => {
    if (!address || !hasMorePages || isLoading) return;
    loadLicenses(address as Address, currentPage + 1);
  }, [address, hasMorePages, isLoading, currentPage, loadLicenses]);

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */
  const fetchTokenIds = async (wallet: Address, tokenCount: number, startOffset: number = 0) => {
    const tokenIds: bigint[] = [];

    for (let start = 0n; start < BigInt(tokenCount); start += BigInt(BATCH_SIZE)) {
      const end = start + BigInt(BATCH_SIZE) > BigInt(tokenCount)
        ? BigInt(tokenCount)
        : start + BigInt(BATCH_SIZE);

      /* build readonly call array */
      const readonlyCalls = Array.from({ length: Number(end - start) }, (_, idx): MulticallCall => ({
        target   : LICENSE_CONTRACT_ADDRESS as Address,
        gasLimit : 100_000n,
        callData : encodeFunctionData({
          abi          : LICENSE_ABI,
          functionName : 'tokenOfOwnerByIndex',
          args         : [wallet, BigInt(startOffset) + start + BigInt(idx)],
        }),
      })) as readonly MulticallCall[];

      /* simulate multicall (read-only) */
      const { result } = await publicClient.simulateContract({
        address      : MULTICALL_CONTRACT_ADDRESS as Address,
        abi          : MULTICALL_ABI,
        functionName : 'multicall',
        args         : [readonlyCalls as any],
        account      : wallet,
      }) as unknown as { result: MulticallReturn };

      const [, returnData] = result;

      returnData.forEach((res, idx) => {
        if (!res.success) return;
        const tokenId = decodeFunctionResult({
          abi          : LICENSE_ABI,
          functionName : 'tokenOfOwnerByIndex',
          data         : res.returnData,
        }) as bigint;
        tokenIds.push(tokenId);

        /* optional: console debug */
        // console.log(#${start + BigInt(idx) + 1n} -> tokenId ${tokenId});
      });

      /* polite delay between batches */
      if (end < BigInt(tokenCount))
        await new Promise((r) => setTimeout(r, 100));
    }

    return tokenIds;
  };

  /* ---------------------------------------------------------------- */
  /*  Returned API                                                    */
  /* ---------------------------------------------------------------- */
  return {
    licenses,          // list of { tokenId, selected }
    balance,           // licences.length
    totalBalance,      // actual total from blockchain
    isLoading,
    hasMorePages,
    currentPage,
    loadMoreLicenses,  // function to load next page
  };
}