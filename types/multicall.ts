import {
    type Address,
    type Hex,
  } from 'viem';

  
export interface License {
    tokenId: number;
    selected: boolean;
}

export interface MulticallResult {
    success: boolean;
    gasUsed: bigint;
    returnData: Hex;
  }
export interface MulticallCall {
    target: Address;
    gasLimit: bigint;
    callData: Hex;
  }

export  type MulticallReturn = readonly [
    bigint,
    readonly MulticallResult[]
  ];
  