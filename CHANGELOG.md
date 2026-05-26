# Changelog

## 2026-05-26 — Delegation Offers Overhaul

---

### Contract Addresses Updated (`lib/constant.ts`)

All four core contract addresses were updated to point to the latest deployment.

| Contract | Old Address | New Address |
|---|---|---|
| LICENSE_1155 | `0x9cA9D4B531EDc11b307161Ef1E36aF06C47DeDB8` | `0xd8b6Eb98aE38B0ee7b08BDC9bdf868DF1BbAC63e` |
| LICENSE_ESCROW | `0x94550026d4a73e6f345845Def091804ed0Cd2707` | `0xb89bA4578751d4dbBB6Af7844cc73ccb48182a97` |
| DELEGATION | `0x5C71Ac4688F67186343b56AFFa0B7424cc373536` | `0x8372a26B493fFa80a220eb1a67b4d683a140F792` |
| REWARDS | `0x01b4156b98f0Eb7914c02EEc9a676D531796c607` | `0xEeFf775ecDE6dA14Ec2Be43DA45721752fCb1381` |

ORACLE and MAWARI_TOKEN addresses remain unchanged. Addresses still fall back to env vars (`NEXT_PUBLIC_LICENSE_ADDRESS`, etc.) when set.

---

### ABIs Updated (`lib/abi/`)

Both `Delegation.json` and `License1155.json` were replaced with the latest ABIs sourced from the `mawari-dashboard` repo.

**Delegation.json — key additions:**
- `reduceOfferDelegation(address to, uint256 tier, uint256 amount)` — allows a creator to partially reduce the amount on an existing offer without fully cancelling it.
- `getDelegationCheckpoint` / `getDelegationCheckpointCount` — read historical delegation snapshots per (staker, tier, node).
- `getHistoricalDelegatedNodesCount` / `getHistoricalDelegatedNodesPage` / `getHistoricalNodeDelegators` — paginated historical lookups.
- Role-based access control replaces Ownable: `DEFAULT_ADMIN_ROLE`, `DELEGATION_ADMIN_ROLE`, `PAUSER_ROLE`, `UPGRADER_ROLE`.
- `DelegationOfferReduced` event — emitted when an offer is partially reduced.
- `EpochConfigNotSet`, `InsufficientEscrowedLicenses`, `NoLicenseInEscrow`, `ReductionExceedsOffer`, `ZeroAddress`, `ZeroAmount` error types added.

**License1155.json — key additions:**
- `setMaxSupply(uint256 tier, uint256 newMaxSupply)` — admin function to update per-tier max supply.
- `UPGRADER_ROLE` constant.

---

### New Hook: `useDelegationOffers()` (`hooks/use-delegation-offers.ts`)

This is the main new feature. It replaces the previous approach that relied on `useDashboardAuth` + `dashboardClient` for offer reporting. Everything is now purely on-chain — no backend dependency for offer lifecycle.

#### How offer discovery works

Instead of relying on localStorage or a backend API to track which offers exist, the hook scans on-chain event logs directly:

1. On mount (and every 12 seconds), it fetches `DelegationOfferCreated`, `DelegationOfferAccepted`, and `DelegationOfferCancelled` logs from the last 100,000 blocks for the connected wallet address.
2. It builds a map of the latest event per offer hash. If the latest event is `created` (not yet accepted or cancelled), the offer is a candidate.
3. For each candidate, it calls `getDelegationOffer(hash)` on-chain to confirm `isActive === true`.
4. Offers are split into `createdOffers` (user is the `from`) and `receivedOffers` (user is the `to`).

This runs as a TanStack Query with `refetchInterval: 12_000` and `staleTime: 5_000`, so the UI stays current without manual refresh.

#### `createOffer(to, tier, amount)` — how it works

```
User wallet  ──safeTransferFrom──>  License1155  ──onERC1155Received──>  Delegation contract
                                                                          │
                                                                          ├── locks licenses
                                                                          ├── creates offer struct
                                                                          └── emits DelegationOfferCreated
```

The user calls `safeTransferFrom(self, DELEGATION_ADDRESS, tier, amount, encodedRecipient)` on the License1155 contract. The Delegation contract's `onERC1155Received` hook decodes the recipient from `data`, creates the offer, and emits `DelegationOfferCreated`.

**Why no escrow approval is needed:** The user is both `msg.sender` and the `from` address in `safeTransferFrom`. ERC-1155 allows token owners to transfer their own tokens without any operator approval. This is different from `batchDepositAndOfferDelegation` where the Delegation contract pulls tokens on the user's behalf (that flow would need approval).

The offer hash is extracted from the transaction receipt logs (first indexed topic from the `DelegationOfferCreated` event emitted by the Delegation contract).

#### `batchCreateOffer(params[])` — batch version

Calls `batchDepositAndOfferDelegation` on the Delegation contract with an array of `{to, tier, amount}` params. Uses `simulateContract` first for error checking, then `writeContract`. Offer hashes are captured from the simulation return value.

**Note:** This flow goes through the Delegation contract directly, so it _does_ require the user to have approved the escrow/delegation contract as an operator on License1155 (unlike single `createOffer`).

#### Other operations

| Function | Contract call | Notes |
|---|---|---|
| `cancelOffer(hash)` | `cancelDelegationOffer` | Marks inactive, does NOT withdraw licenses back |
| `cancelOfferAndWithdraw(hash)` | `cancelOfferAndWithdraw` | Marks inactive AND withdraws licenses to creator |
| `batchCancelOfferAndWithdraw(hashes[])` | `batchCancelOfferAndWithdraw` | Batch version of above |
| `reduceOffer(to, tier, amount)` | `reduceOfferDelegation` | Partially reduce offer amount without cancelling |
| `acceptOffer(hash)` | `acceptDelegationOffer` | Recipient accepts, delegation becomes active |
| `getOffer(hash)` | `getDelegationOffer` | Read-only, returns offer struct |

All mutation functions follow the pattern: `simulateContract` (catches revert before sending tx) → `writeContract` → `waitForTransactionReceipt` → `revalidateDelegationUi` (invalidates TanStack Query caches).

#### Cache invalidation

After every mutation, `revalidateDelegationUi` invalidates these query keys:
- `['delegationOffers', address]` — the offer scanner re-runs
- `['delegationStakes', address]` — active delegations refresh
- `['licenseBalances', address]` — wallet balances refresh

This means after any tx confirms, all three UI sections update immediately without waiting for the polling interval.

---

### Updated Hook: `useStakingDelegation()` (`hooks/use-staking-delegation.ts`)

This hook was slimmed down. It previously owned all delegation operations; now it only handles staking/undelegation. Offer operations moved to `useDelegationOffers`.

**Removed:**
- `depositAndOfferDelegation` — now `useDelegationOffers.createOffer`
- `cancelOfferAndWithdraw` — now `useDelegationOffers.cancelOfferAndWithdraw`
- `acceptDelegationOffer` — now `useDelegationOffers.acceptOffer`

**Added:**
- `batchUndelegateAndWithdraw(params[])` — calls `batchUndelegateAndWithdraw` on the Delegation contract with an array of `{tier, node, amount}` params. Useful for undelegating from multiple nodes in a single transaction.

**Kept:**
- `undelegateAndWithdraw` — single undelegate + withdraw
- `refetch` — invalidates all delegation-related query caches
- `isLoading` / `error` / `currentEpoch`

---

### Updated Hook: `useDelegatedNodes` / `useNodeDelegation` (`hooks/use-stake-info.ts`)

**Problem:** Active Delegations table had no auto-polling. If someone accepted your offer on their end, your UI wouldn't reflect the new delegation until you refreshed the page or refocused the tab.

**Fix:** Added `refetchInterval: 15_000` to both `useDelegatedNodes` and `useNodeDelegation` queries. Also reduced `staleTime` from 30s to 15s so the interval actually triggers re-fetches.

**Result:** The Active Delegations table now auto-updates every 15 seconds. Combined with the explicit `refetchDelegations()` call after user-initiated actions, the table stays current in all scenarios:
- User accepts an offer → immediate update (explicit refetch)
- Other party accepts your offer → updates within 15s (polling)
- Tab refocus → immediate update (`refetchOnWindowFocus: true`)

---

### UI Changes (`components/deploy/StakeAndDelegate.tsx`)

**Before:** The component used `useStakingDelegation` for offer operations, `usePendingOfferHashes` (localStorage) to track pending offers, manual `useWatchContractEvent` watchers for accepted/cancelled events, and gated the offer form behind escrow approval.

**After:**
- Uses `useDelegationOffers` for all offer operations (create, cancel).
- Pending offers are sourced from the on-chain event scanner (`createdOffers` from the hook), not localStorage.
- Removed `useWatchContractEvent` watchers — the TanStack Query polling handles it.
- Removed the escrow approval gate (`useEscrowApproval`, `ApproveEscrowCard`). The offer form is always shown when the wallet is connected because `createOffer` uses `safeTransferFrom` (owner transferring own tokens = no approval needed).
- Removed the "Received delegation offers" section (not needed in this UI).

**Data flow for creating an offer:**
1. User fills out form (tier, recipient, amount) and clicks "Create delegation offer"
2. `handleCreateOffer` sets `isCreatingOffer = true` (disables form)
3. Calls `createOffer(to, tier, amount)` from `useDelegationOffers`
4. On success: clears form, shows toast, calls `refetchLicenseBalance()` + `refetchOffers()`
5. The pending offers table updates immediately (query cache invalidated)

**Data flow for cancelling an offer:**
1. User clicks "Cancel & withdraw" on a pending offer row
2. Confirmation dialog appears (in `PendingDelegationOffersSection`)
3. `handleCancelOffer` sets `cancelingOfferHash` (shows spinner on that row)
4. Calls `cancelOfferAndWithdraw(hash)` from `useDelegationOffers`
5. On success: shows toast, calls `refetchLicenseBalance()` + `refetchOffers()`
6. The offer disappears from pending table, license balance updates

---

### Build Change (`package.json`)

Dev server switched from webpack to Turbopack:

```diff
- "dev": "next dev",
+ "dev": "next dev --turbo",
```

Startup time improved from ~3s to ~700ms. No code changes required — Turbopack is a drop-in replacement for the dev bundler in Next.js 14.2+.

---

### Files Changed Summary

| File | Change |
|---|---|
| `lib/constant.ts` | Updated 4 contract addresses |
| `lib/abi/Delegation.json` | Replaced with latest ABI |
| `lib/abi/License1155.json` | Replaced with latest ABI |
| `hooks/use-delegation-offers.ts` | Added `useDelegationOffers` hook (event scanner + full offer CRUD) |
| `hooks/use-staking-delegation.ts` | Removed offer ops, added `batchUndelegateAndWithdraw` |
| `hooks/use-stake-info.ts` | Added 15s polling to delegation queries |
| `components/deploy/StakeAndDelegate.tsx` | Rewired to use new hooks, removed approval gate |
| `components/deploy/ReceivedDelegationOffersSection.tsx` | New file (created but not used in current UI) |
| `package.json` | Added `--turbo` flag to dev script |
