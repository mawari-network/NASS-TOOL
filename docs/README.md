# NASS Tool — Documentation

This folder documents how the app interacts with on-chain contracts: which ABIs and functions are used, and what in the UI triggers each call.

## Contents

- **[ABI Functions & Triggers](./abi-functions-and-triggers.md)** — Contract addresses, ABIs, every function we call (read/write), events we watch, and what triggers them (hooks, components, user actions).

## Contract overview

| Contract           | Purpose |
|--------------------|--------|
| **License1155**    | ERC-1155 licenses; we read balances and approval, and set approval for the escrow. |
| **Delegation**     | Staking/delegation and delegation offers; we read state, create/cancel/accept offers, and undelegate+withdraw. |
| **LicenseEscrow**  | Referenced only as the *operator* for License1155 approval; we do not call its ABI in this app. |

Other addresses (Rewards, Oracle, Mawari Token) are in config but not used by the current UI.
