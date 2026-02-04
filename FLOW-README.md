# Stake & Delegate Licenses — User Flow

This document explains the complete user flow for staking and delegating Mawari licenses to node operators, including why escrow approval is required.

---

## User Flow Overview

```
1. Connect Wallet  →  2. Approve Escrow  →  3. Deposit & Delegate
```

---

## Step-by-Step User Flow

### Step 1: Connect Wallet

**What happens:** The user clicks **Connect Wallet** in the header and connects their Web3 wallet (e.g., MetaMask) via AppKit.

**Why:** The app needs to know which wallet holds the licenses and who will sign transactions. All later steps (approval, deposit, delegate) are done from this connected wallet.

**Requirements:**
- Wallet must be on the correct network (Mawari testnet/mainnet)
- Wallet must hold License1155 tokens (Tier 1 Gold, Tier 2 Silver, or Tier 3 Bronze)

---

### Step 2: Approve Escrow Contract

**What happens:** The user clicks **Approve Escrow Contract**. This sends a transaction to the License1155 contract calling `setApprovalForAll(escrowAddress, true)`.

**Why this step is required:** See [Why Escrow Needs Approval](#why-escrow-needs-approval) below.

**User experience:**
- Only the approve button is shown at this step (no tier, amount, or node fields)
- After approval, the UI moves to Step 3
- Approval is one-time per wallet; it persists until revoked

---

### Step 3: Deposit & Delegate

**What happens:** The user:

1. **Selects License Tier** — Gold (Tier 1), Silver (Tier 2), or Bronze (Tier 3)
2. **Enters Number of Licenses** — How many licenses to stake and delegate
3. **Enters Node Address** — The node operator address to delegate to (0x...)
4. Clicks **Deposit & Delegate**

**Behind the scenes:** A single transaction calls `depositAndDelegate(tier, nodeAddress, amount)` on the Delegation contract. This:

1. Pulls licenses from the user's wallet into License Escrow (requires prior approval)
2. Deposits and locks them in escrow for delegation
3. Delegates them to the specified node address

**Result:** Licenses are staked and delegated. They become active in the next epoch. See [How Deposit Works with License Escrow](#how-deposit-works-with-license-escrow) for the full technical flow.

---

## Why Escrow Needs Approval

### ERC1155 and Operator Permissions

Licenses are ERC1155 tokens. By default, only the token owner can move them. To let another contract (the escrow) move tokens on behalf of the user, the user must grant **operator approval**.

### What `setApprovalForAll` Does

```
setApprovalForAll(operator, approved)
```

- **operator:** The License Escrow contract address  
- **approved:** `true` to allow, `false` to revoke  

When `approved` is `true`, the escrow can call `safeTransferFrom(owner, to, id, amount, data)` to move the user's licenses without the user signing each transfer.

### Why the Escrow Must Be Approved

When the user clicks **Deposit & Delegate**:

1. The **Delegation** contract calls the **License Escrow** contract.
2. The Escrow must **pull** licenses from the user's wallet into escrow.
3. That pull is a `safeTransferFrom` from the user to the escrow.
4. `safeTransferFrom` requires the caller (the Escrow) to be an approved operator for the user.
5. Without prior approval, the transfer would revert with `ERC1155MissingApprovalForAll`.

So the approval step is required so the Escrow can legally move the user's tokens during deposit.

### Security and User Control

- **Explicit consent:** The user explicitly approves the escrow before any tokens move.
- **Scoped:** Only the Escrow contract can move tokens, not arbitrary addresses.
- **Revocable:** The user can call `setApprovalForAll(escrow, false)` to revoke.
- **No amount limit:** `setApprovalForAll` is an all-or-nothing approval for that operator. The user still controls exactly how many licenses to deposit in Step 3.

---

## How Deposit Works with License Escrow

Staking uses a **virtual staking model** where licenses remain in escrow rather than being transferred to the Delegation contract. This enhances security and flexibility.

### Single-Transaction Flow: `depositAndDelegate`

The app uses **`depositAndDelegate(tier, nodeAddress, amount)`** — one transaction that does everything:

1. **Pull licenses from wallet** — Delegation contract (via Escrow) pulls licenses from the user's wallet into License Escrow (requires prior `setApprovalForAll`).
2. **Deposit to escrow** — Licenses are deposited into License Escrow (source of truth).
3. **Lock for delegation** — Escrow locks licenses for the Delegation contract (`lockForDelegation`).
4. **Delegate to node** — Delegation contract records the delegation to the specified node address.

### Complete Staking Flow Diagram

```
┌─────────────┐
│   User      │
│  (License   │
│   Holder)   │
└──────┬──────┘
       │
       │ 1. setApprovalForAll(escrow, true)
       │    (one-time, on License1155)
       ▼
┌──────────────────┐
│  License1155     │  User approves Escrow to move tokens
│  (NFT Contract)  │
└──────────────────┘

       │
       │ 2. depositAndDelegate(tier, node, amount)
       │    (single transaction on Delegation contract)
       ▼
┌─────────────────┐     pull from user     ┌──────────────────┐
│  Delegation     │◄───────────────────────│  License Escrow   │
│  Contract       │  safeTransferFrom      │  (source of       │
│  (Virtual       │  deposit + lock        │   truth)         │
│   Staking)      │                        └──────────────────┘
└────────┬────────┘
         │
         │ 3. delegate to node
         ▼
┌─────────────────┐
│  Node           │  Licenses delegated (active next epoch)
│  (Address)      │
└─────────────────┘
```

### Withdraw Flow

When the user undelegates all licenses (`undelegateAndWithdraw`):

1. Delegation contract calls `unlockForDelegation` on Escrow (when `stakedAmount` reaches zero).
2. Licenses are unlocked in Escrow.
3. Licenses are withdrawn back to the user's wallet.

### Security Benefits

- **Licenses stay in Escrow** — Single source of truth; Delegation contract does not hold tokens.
- **Virtual staking** — Delegation contract tracks stakes and delegations without custody.
- **One-step UX** — `depositAndDelegate` combines deposit + lock + delegate in one transaction.

---

## Managing Active Delegations

The UI shows a table of **Active Stakes & Delegations** with:

- **Tier** — Gold, Silver, or Bronze
- **Delegated To** — Node address (with copy button)
- **Amount** — Number of licenses delegated
- **Status** — Active
- **Action** — **Undelegate** button

**Undelegate:** Withdraws licenses from the node and returns them to the user's wallet in one transaction (`undelegateAndWithdraw`).

---

## Future Improvements — Gas Optimizations

These improvements could reduce gas fees when users have many delegations or want to delegate across multiple tiers:

### 1. Batch `undelegateAndWithdraw` via Multicall (Active Stakes)

**Current behavior:** Each delegation in the Active Stakes table has its own **Undelegate** button. Clicking it sends one transaction per delegation.

**Improvement:** When a user has **many active delegations** (e.g. multiple nodes, multiple tiers), add a **"Undelegate All"** or **"Batch Undelegate"** option that uses **multicall** to batch multiple `undelegateAndWithdraw(tier, nodeAddress, amount)` calls into a single transaction.

**Benefit:** One transaction instead of many → lower total gas fees, fewer wallet confirmations.

---

### 2. Batch `depositAndDelegate` for Multiple Tiers via Multicall

**Current behavior:** The user selects one tier, amount, and node per transaction. To delegate Gold, Silver, and Bronze to the same (or different) nodes, they must submit separate transactions.

**Improvement:** Add support for **batch deposit & delegate** — e.g. delegate Tier 1 to Node A, Tier 2 to Node B, Tier 3 to Node A — all in one transaction using **multicall** to batch multiple `depositAndDelegate(tier, nodeAddress, amount)` calls.

**Benefit:** One transaction for all tiers → lower gas fees, faster onboarding for users with licenses across multiple tiers.

---

### Summary of Multicall Benefits

| Scenario | Current | With Multicall |
|----------|---------|----------------|
| Undelegate 5 delegations | 5 transactions | 1 transaction |
| Delegate 3 tiers to nodes | 3 transactions | 1 transaction |
| Gas savings | — | Fewer tx overhead, shared base gas |


| Step | Action | Purpose |
|------|--------|---------|
| 1 | Connect Wallet | Identify the user and enable signing |
| 2 | Approve Escrow | Allow the Escrow to move the user's licenses |
| 3 | Deposit & Delegate | Choose tier, amount, node, and execute in one tx |

**Escrow approval is required** because ERC1155 tokens can only be transferred by the owner or an approved operator. The Escrow must be an approved operator before it can pull licenses from the user's wallet during deposit.
