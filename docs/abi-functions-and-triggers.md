# ABI Functions & Triggers

This document lists every contract function and event the app uses, which ABI/contract they belong to, and **what triggers** each call (which hook, component, or user action).

Contract addresses come from `lib/constant.ts` (env: `NEXT_PUBLIC_*_ADDRESS`). ABIs live in `lib/abi/*.json`.

---

## 1. License1155 (ERC-1155)

**Contract:** `CONTRACT.LICENSE_1155`  
**ABI:** `lib/abi/License1155.json`  
**Purpose:** License NFTs; we check/grant approval for the escrow and read wallet balances per tier.

### 1.1 `isApprovedForAll(owner, operator) → bool` (read)

| What | Detail |
|------|--------|
| **Trigger** | User has wallet connected and the “Stake & Delegate” view is rendered. |
| **Where** | `useApproval` → used by `useEscrowApproval`. `useEscrowApproval` is used in `StakeAndDelegate.tsx`. |
| **Args** | `owner` = connected wallet; `operator` = `CONTRACT.LICENSE_ESCROW`. |
| **Why** | To decide whether to show the “Approve Escrow” card or the “Create delegation offer” form. |

**Flow:** `StakeAndDelegate` → `useEscrowApproval(address)` → `useApproval(owner, operator: LICENSE_ESCROW)` → `useReadContract(…, functionName: 'isApprovedForAll', args: [owner, operator])`.

---

### 1.2 `setApprovalForAll(operator, approved)` (write)

| What | Detail |
|------|--------|
| **Trigger** | User clicks **“Approve Escrow Contract”** in the Approve Escrow card. |
| **Where** | `useApproval.approve()` → called by `StakeAndDelegate.handleApprove()`, which is passed to `ApproveEscrowCard`. |
| **Args** | `operator` = `CONTRACT.LICENSE_ESCROW`, `approved` = `true`. |
| **Why** | Allows the LicenseEscrow (and thus the Delegation contract) to move the user’s licenses when creating offers or delegating. |

**Flow:** User click “Approve Escrow Contract” → `handleApprove()` → `approveEscrow()` → `useApproval.approve()` → `simulateContract` + `writeContract` for `setApprovalForAll(operator, true)` on License1155.

---

### 1.3 `balanceOfBatch(accounts[], ids[]) → uint256[]` (read)

| What | Detail |
|------|--------|
| **Trigger** | User is on the Stake & Delegate screen and has a connected wallet. |
| **Where** | `useLicenseBalance()` in `StakeAndDelegate` and in `OfferDelegationForm` (via props). |
| **Args** | `accounts` = `[address, address, address]` (same wallet 3×), `ids` = `[1, 2, 3]` (tier token IDs). |
| **Why** | Shows “Available: X” per tier in the create-offer form and drives validation. |

**Flow:** `StakeAndDelegate` → `useLicenseBalance()` → `useReadContract(…, functionName: 'balanceOfBatch', args: [[address, address, address], [1n,2n,3n]])`. Result is used by `getBalanceForTier(tier)` and passed into `OfferDelegationForm`.

---

## 2. Delegation contract

**Contract:** `CONTRACT.DELEGATION`  
**ABI:** `lib/abi/Delegation.json`  
**Purpose:** Staking, delegation, and delegation offers (create, cancel, accept, undelegate+withdraw).

### 2.1 `currentEpoch() → uint32` (read)

| What | Detail |
|------|--------|
| **Trigger** | Whenever the hook is used (e.g. by staking/delegation logic that needs current epoch). |
| **Where** | `useCurrentEpoch()` in `hooks/use-epoch-info.ts`; used by `useStakingDelegation`. |
| **Why** | Epoch is used internally by the delegation hook (e.g. for cache/refetch or future logic). |

**Flow:** `useStakingDelegation` → `useCurrentEpoch()` → `useReadContract(…, functionName: 'currentEpoch')`.

---

### 2.2 `getDelegatedNodes(staker, tier) → address[]` (read)

| What | Detail |
|------|--------|
| **Trigger** | “Active Stakes & Delegations” section is rendered for the connected wallet. |
| **Where** | `useDelegatedNodes({ staker, tier })` in `use-stake-info.ts`; used by `useHasAnyDelegations` and `DelegationRows` in `ActiveDelegationsSection.tsx`. |
| **Args** | `staker` = connected address, `tier` = 1, 2, or 3. |
| **Why** | Lists which node addresses the user has delegated to per tier so we can show rows and “Undelegate” actions. |

**Flow:** `ActiveDelegationsSection` → `useHasAnyDelegations(staker)` (calls `useDelegatedNodes` for tiers 1,2,3) and `DelegationRows` → `useDelegatedNodes({ staker, tier })` → `useReadContract(…, functionName: 'getDelegatedNodes', args: [staker, tier])`.

---

### 2.3 `getNodeDelegation(staker, tier, node) → (amount, activeFromEpoch, lastClaimedEpoch)` (read)

| What | Detail |
|------|--------|
| **Trigger** | For each row in “Active Stakes & Delegations” we need the delegated amount for that (staker, tier, node). |
| **Where** | `useNodeDelegation({ staker, tier, node })` in `use-stake-info.ts`; used by `DelegationRow` in `ActiveDelegationsSection.tsx`. |
| **Args** | `staker`, `tier`, `node` from the table row. |
| **Why** | Displays amount and enables “Undelegate” with the correct `amount` for `undelegateAndWithdraw`. |

**Flow:** `DelegationRow` → `useNodeDelegation({ staker, tier, node })` → `useReadContract(…, functionName: 'getNodeDelegation', args: [staker, tier, node])`.

---

### 2.4 `getDelegatedAmount(staker, tier, node, epoch) → uint256` (read)

| What | Detail |
|------|--------|
| **Trigger** | When the hook is called with `epoch` set (used when we need amount at a specific epoch). |
| **Where** | `useNodeDelegation({ staker, tier, node, epoch })` in `use-stake-info.ts`; when `epoch !== undefined`, the hook calls `getDelegatedAmount` instead of `getNodeDelegation`. |
| **Why** | For historical or epoch-specific delegation amount (e.g. rewards or display). |

**Flow:** Same as `getNodeDelegation` but with `epoch` in params → `useReadContract(…, functionName: 'getDelegatedAmount', args: [staker, tier, node, epoch])`.

---

### 2.5 `getDelegationOffer(offerHash) → (from, to, tier, amount, isActive)` (read)

| What | Detail |
|------|--------|
| **Trigger** | For each pending offer hash we store (localStorage), we poll the contract to show offer details and status. |
| **Where** | `useDelegationOffer(offerHash)` in `use-delegation-offers.ts`; used by `PendingOfferRow` in `PendingDelegationOffersSection.tsx`. |
| **Args** | `offerHash` = bytes32 from creation or from our pending list. |
| **Why** | Renders tier, “Offer to”, amount, and “Cancel & withdraw”; also when the call reverts (OfferNotFound etc.) we remove the hash from the pending list. |

**Flow:** `PendingDelegationOffersSection` → for each hash, `PendingOfferRow` → `useDelegationOffer(offerHash)` → `useReadContract(…, functionName: 'getDelegationOffer', args: [offerHash])` (with short refetch interval). Errors handled by `isOfferGoneError()` to auto-remove stale offers.

---

### 2.6 `depositAndOfferDelegation(to, tier, amount) → offerHash` (write)

| What | Detail |
|------|--------|
| **Trigger** | User fills tier, recipient address, amount and clicks **“Create delegation offer”**. |
| **Where** | `useStakingDelegation().depositAndOfferDelegation()`; called from `StakeAndDelegate.handleCreateOffer()`, which is passed to `OfferDelegationForm` as `onCreateOffer`. |
| **Args** | `to` = recipient address, `tier` = 1|2|3, `amount` = license amount (bigint). |
| **Why** | Creates an on-chain offer; the UI stores the returned `offerHash` in the pending list so the recipient can accept later. |

**Flow:** User submit in `OfferDelegationForm` → `onCreateOffer()` → `handleCreateOffer()` → `depositAndOfferDelegation({ to, tier, amount })` → `simulateContract` + `writeContract` on Delegation; `offerHash` from simulation result is passed to `addPendingOfferHash(offerHash)`.

---

### 2.7 `cancelOfferAndWithdraw(offerHash)` (write)

| What | Detail |
|------|--------|
| **Trigger** | User clicks **“Cancel & withdraw”** on a pending offer and confirms in the dialog. |
| **Where** | `useStakingDelegation().cancelOfferAndWithdraw(offerHash)`; called from `StakeAndDelegate.handleCancelOffer()`, passed to `PendingDelegationOffersSection` → `PendingOfferRow` confirm dialog. |
| **Args** | `offerHash` = bytes32 of the offer to cancel. |
| **Why** | Cancels the offer on-chain and withdraws the licenses back to the user; we then remove the hash from the pending list. |

**Flow:** User confirm in AlertDialog → `onCancelOffer(offerHash)` → `handleCancelOffer(offerHash)` → `cancelOfferAndWithdraw(offerHash)` → `simulateContract` + `writeContract`; on success `removePendingOfferHash(offerHash)`.

---

### 2.8 `undelegateAndWithdraw(tier, node, amount)` (write)

| What | Detail |
|------|--------|
| **Trigger** | User clicks **“Undelegate”** on a row in “Active Stakes & Delegations”. |
| **Where** | `useStakingDelegation().undelegateAndWithdraw()`; called from `StakeAndDelegate.handleUndelegate()`, passed to `ActiveDelegationsSection` → `DelegationRow`. |
| **Args** | `tier`, `node` (address), `amount` from the row’s delegation data. |
| **Why** | Removes delegation from that node and withdraws the licenses back to the user’s wallet. |

**Flow:** User click “Undelegate” on row → `onUndelegate(tier, node, amount)` → `handleUndelegate()` → `undelegateAndWithdraw({ tier, nodeAddress: node, amount })` → `simulateContract` + `writeContract` on Delegation.

---

### 2.9 `acceptDelegationOffer(offerHash)` (write)

| What | Detail |
|------|--------|
| **Trigger** | Not triggered by the current UI. The **node/recipient** accepts offers (e.g. from a node client or another app). |
| **Where** | `useStakingDelegation().acceptDelegationOffer(offerHash)` is exposed by the hook but not used in `StakeAndDelegate` or other deploy components. |
| **Why** | If we later add a “Accept offer” flow in this app, we would call this with the offer hash. |

**Flow:** Hook only; no UI in this repo triggers it. When the recipient accepts elsewhere, we react via the **DelegationOfferAccepted** event (see below).

---

### 2.10 Events we watch (Delegation)

We don’t call a function for these; we subscribe to logs.

| Event | Trigger | Where | Why |
|-------|--------|--------|-----|
| **DelegationOfferAccepted** | Emitted when someone calls `acceptDelegationOffer(offerHash)` on-chain. | `StakeAndDelegate.tsx`: `useWatchContractEvent(…, eventName: 'DelegationOfferAccepted', poll: true, pollingInterval: 2000, onLogs)`. | So we remove that `offerHash` from the pending list and refetch delegations without the user refreshing. |
| **DelegationOfferCancelled** | Emitted when someone calls `cancelOfferAndWithdraw(offerHash)` (or contract cancels). | Same file: `useWatchContractEvent(…, eventName: 'DelegationOfferCancelled', …)`. | Same: remove from pending list and refetch. |

In both handlers we read `offerHash` from `log.topics[1]` and call `removePendingOfferHash(hash)` and `refetchDelegations()`.

---

## 3. LicenseEscrow (no direct ABI calls)

We **never** call the LicenseEscrow contract’s ABI in this app. We only use its **address** as the `operator` in License1155’s `isApprovedForAll` and `setApprovalForAll`. The Delegation contract (and possibly the escrow) perform the actual escrow/deposit/withdraw when you create offers or undelegate.

---

## 4. Summary table

| Contract     | Function / Event              | Type   | Triggered by |
|-------------|-------------------------------|--------|----------------|
| License1155 | `isApprovedForAll`            | read   | `useEscrowApproval` when Stake & Delegate screen is shown |
| License1155 | `setApprovalForAll`           | write  | User clicks “Approve Escrow Contract” |
| License1155 | `balanceOfBatch`              | read   | `useLicenseBalance` on Stake & Delegate screen |
| Delegation  | `currentEpoch`                | read   | `useStakingDelegation` (internal) |
| Delegation  | `getDelegatedNodes`           | read   | Active delegations section (per tier) |
| Delegation  | `getNodeDelegation`           | read   | Each row in active delegations table |
| Delegation  | `getDelegatedAmount`          | read   | When `useNodeDelegation` is called with `epoch` |
| Delegation  | `getDelegationOffer`          | read   | Each pending offer row (polled) |
| Delegation  | `depositAndOfferDelegation`   | write  | User clicks “Create delegation offer” |
| Delegation  | `cancelOfferAndWithdraw`      | write  | User confirms “Cancel & withdraw” in dialog |
| Delegation  | `undelegateAndWithdraw`       | write  | User clicks “Undelegate” on an active delegation row |
| Delegation  | `acceptDelegationOffer`       | write  | Exposed by hook only; not used in current UI |
| Delegation  | `DelegationOfferAccepted`     | event  | `useWatchContractEvent` in `StakeAndDelegate` |
| Delegation  | `DelegationOfferCancelled`    | event  | Same |

---

## 5. Hook → contract mapping

| Hook | Contract | Functions |
|------|----------|-----------|
| `useApproval` | License1155 | `isApprovedForAll` (read), `setApprovalForAll` (write) |
| `useEscrowApproval` | (uses License1155 via `useApproval` with operator = LicenseEscrow) | same as above |
| `useLicenseBalance` | License1155 | `balanceOfBatch` |
| `useCurrentEpoch` | Delegation | `currentEpoch` |
| `useDelegatedNodes` | Delegation | `getDelegatedNodes` |
| `useNodeDelegation` | Delegation | `getNodeDelegation` or `getDelegatedAmount` |
| `useDelegationOffer` | Delegation | `getDelegationOffer` |
| `usePendingOfferHashes` | (none) | localStorage only |
| `useStakingDelegation` | Delegation | `undelegateAndWithdraw`, `depositAndOfferDelegation`, `cancelOfferAndWithdraw`, `acceptDelegationOffer` (write); uses `useCurrentEpoch` for read |
| `StakeAndDelegate` (component) | Delegation | Subscribes to `DelegationOfferAccepted` and `DelegationOfferCancelled` via `useWatchContractEvent` |

This is the complete set of ABI functions and events we use and what triggers them.
