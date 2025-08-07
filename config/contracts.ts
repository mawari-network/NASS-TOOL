export const LICENSE_CONTRACT_ADDRESS = "0x723ae7673D2D89C59eED1508C563B1529f24958d";
export const MULTICALL_CONTRACT_ADDRESS = "0x762e9892e9FD63B673b7c819E649B6178c53894b";
export const RPC_URL = "https://mawari-network-testnet.rpc.caldera.xyz/http"
// ERC-721 Enumerable (only what we need)
export const LICENSE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{              type: "uint256" }],
  },
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Mawari Multicall (view)
export const MULTICALL_ABI = [
  {
    "name": "getCurrentBlockTimestamp",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "timestamp", "type": "uint256" }
    ]
  },
  {
    "name": "getEthBalance",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "addr", "type": "address" }
    ],
    "outputs": [
      { "name": "balance", "type": "uint256" }
    ]
  },
  {
    "name": "multicall",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "name": "calls",
        "type": "tuple[]",
        "components": [
          { "name": "target",    "type": "address"  },
          { "name": "gasLimit",  "type": "uint256"  },
          { "name": "callData",  "type": "bytes"    }
        ]
      }
    ],
    "outputs": [
      { "name": "blockNumber", "type": "uint256" },
      {
        "name": "returnData",
        "type": "tuple[]",
        "components": [
          { "name": "success",    "type": "bool"    },
          { "name": "gasUsed",    "type": "uint256" },
          { "name": "returnData", "type": "bytes"   }
        ]
      }
    ]
  }
]as const;


export const DELEGATION_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "commissionPercentage", type: "uint8" },
      { name: "enable", type: "bool" }
    ],
    name: "offerDelegation",
    outputs: [
      { name: "offerHash", type: "bytes32" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "data", type: "bytes[]" }
    ],
    name: "multicall",
    outputs: [
      { name: "results", type: "bytes[]" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;