const { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, decodeFunctionResult } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

// Contract addresses
const LICENSE_CONTRACT_ADDRESS = "0x76eFE990CaaDb992C28B97273F364e8dc0E1ebCa";
const DELEGATION_CONTRACT_ADDRESS = "0x98c3d132cc9Ce2d45DDaf899e6628ce86845A23E";
const RPC_URL = "https://mawari-network-testnet.rpc.caldera.xyz/http";

// Chain configuration
const mawariTestnet = {
  id: 629274,
  name: 'Mawari Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MAWARI',
    symbol: 'MAWARI',
  },
  rpcUrls: {
    public: { http: [RPC_URL] },
    default: { http: [RPC_URL] },
  },
};

// Delegation Contract ABI (only the functions we need)
const DELEGATION_ABI = [
  {
    "type": "function",
    "name": "offerDelegation",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "commissionPercentage",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "enable",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "offerHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "multicall",
    "inputs": [
      {
        "name": "data",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "outputs": [
      {
        "name": "results",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "delegationOffersEnabled",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  }
];

// License Contract ABI (ERC-721 functions)
const LICENSE_ABI = [
  {
    "name": "balanceOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "owner", "type": "address" }],
    "outputs": [{ "type": "uint256" }],
  },
  {
    "name": "ownerOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "outputs": [{ "name": "owner", "type": "address" }],
  },
  {
    "name": "tokenOfOwnerByIndex",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "index", "type": "uint256" },
    ],
    "outputs": [{ "type": "uint256" }],
  },
];

// Create clients
const publicClient = createPublicClient({
  chain: mawariTestnet,
  transport: http(RPC_URL),
});

// Configuration - UPDATE THESE VALUES
const PRIVATE_KEY = "0x0e19d15ca868c9b241197cd51efe0f0f07dacde6ad754e6892e1469e56594326"; // Replace with your private key
const OWNER_ADDRESS = "0xd9AEc0335d4000BB841Ef89862403E5D331C3e9f"; // Replace with the wallet address that owns the licenses
const DELEGATEE_ADDRESS = "0x4AB0bCEcae706c9320a826161fC2E58e14B1bB33"; // Address to delegate to
const TOKEN_ID = "11000005"; // Token ID to delegate

async function testOfferDelegation() {
  try {
    console.log("🚀 Starting delegation test...");
    console.log("📋 Configuration:");
    console.log(`   Owner: ${OWNER_ADDRESS}`);
    console.log(`   Delegatee: ${DELEGATEE_ADDRESS}`);
    console.log(`   Token ID: ${TOKEN_ID}`);
    console.log(`   Delegation Contract: ${DELEGATION_CONTRACT_ADDRESS}`);
    console.log(`   License Contract: ${LICENSE_CONTRACT_ADDRESS}`);
    console.log("");

    // Check if delegation offers are enabled
    console.log("🔍 Checking delegation offers status...");
    const offersEnabled = await publicClient.readContract({
      address: DELEGATION_CONTRACT_ADDRESS,
      abi: DELEGATION_ABI,
      functionName: 'delegationOffersEnabled',
    });
    console.log(`   Delegation offers enabled: ${offersEnabled}`);

    // Check if contract is paused
    const isPaused = await publicClient.readContract({
      address: DELEGATION_CONTRACT_ADDRESS,
      abi: DELEGATION_ABI,
      functionName: 'paused',
    });
    console.log(`   Contract paused: ${isPaused}`);

    if (!offersEnabled) {
      console.log("❌ Delegation offers are disabled!");
      return;
    }

    if (isPaused) {
      console.log("❌ Contract is paused!");
      return;
    }

    // Check token ownership
    console.log("🔍 Checking token ownership...");
    const tokenOwner = await publicClient.readContract({
      address: LICENSE_CONTRACT_ADDRESS,
      abi: LICENSE_ABI,
      functionName: 'ownerOf',
      args: [BigInt(TOKEN_ID)],
    });
    console.log(`   Token ${TOKEN_ID} owner: ${tokenOwner}`);

    if (tokenOwner.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
      console.log(`❌ Token ${TOKEN_ID} is not owned by ${OWNER_ADDRESS}`);
      return;
    }

    // Create wallet client
    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: mawariTestnet,
      transport: http(RPC_URL),
    });

    console.log(`   Wallet address: ${account.address}`);

    // Simulate the offer delegation first
    console.log("🔍 Simulating offer delegation...");
    try {
      const { request } = await publicClient.simulateContract({
        address: DELEGATION_CONTRACT_ADDRESS,
        abi: DELEGATION_ABI,
        functionName: 'offerDelegation',
        args: [
          DELEGATEE_ADDRESS,
          BigInt(TOKEN_ID),
          0, // commission percentage
          true // enable
        ],
        account: account.address,
      });
      console.log("✅ Simulation successful");
    } catch (simError) {
      console.log("❌ Simulation failed:", simError.message);
      return;
    }

    // Execute the offer delegation
    console.log("📝 Executing offer delegation...");
    const hash = await walletClient.writeContract({
      address: DELEGATION_CONTRACT_ADDRESS,
      abi: DELEGATION_ABI,
      functionName: 'offerDelegation',
      args: [
        DELEGATEE_ADDRESS,
        BigInt(TOKEN_ID),
        0, // commission percentage
        true // enable
      ],
    });

    console.log(`✅ Transaction sent! Hash: ${hash}`);

    // Wait for transaction receipt
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Transaction confirmed!");
    console.log(`   Block number: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);

    // Check for events
    if (receipt.logs && receipt.logs.length > 0) {
      console.log(`   Events emitted: ${receipt.logs.length}`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    
    // Try to decode error if it's a contract error
    if (error.cause && error.cause.data) {
      console.log("Error data:", error.cause.data);
    }
  }
}

async function testMulticall() {
  try {
    console.log("🚀 Starting multicall test...");
    
    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: mawariTestnet,
      transport: http(RPC_URL),
    });

    // Prepare multicall data
    const calls = [
      encodeFunctionData({
        abi: DELEGATION_ABI,
        functionName: 'offerDelegation',
        args: [
          DELEGATEE_ADDRESS,
          BigInt(TOKEN_ID),
          0,
          true
        ],
      })
    ];

    console.log("📝 Executing multicall...");
    const hash = await walletClient.writeContract({
      address: DELEGATION_CONTRACT_ADDRESS,
      abi: DELEGATION_ABI,
      functionName: 'multicall',
      args: [calls],
    });

    console.log(`✅ Multicall transaction sent! Hash: ${hash}`);

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Multicall transaction confirmed!");

  } catch (error) {
    console.error("❌ Multicall Error:", error);
  }
}

// Main execution
async function main() {
  console.log("=".repeat(60));
  console.log("MAWARI DELEGATION CONTRACT TEST");
  console.log("=".repeat(60));
  
  // Check if private key is set
  if (PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
    console.log("❌ Please update PRIVATE_KEY in the script");
    return;
  }
  
  if (OWNER_ADDRESS === "0x...") {
    console.log("❌ Please update OWNER_ADDRESS in the script");
    return;
  }

  console.log("");
  console.log("Testing individual offerDelegation...");
  await testOfferDelegation();
  
  console.log("");
  console.log("Testing multicall...");
  await testMulticall();
  
  console.log("");
  console.log("=".repeat(60));
  console.log("Test completed!");
}

// Run the test
main().catch(console.error);
