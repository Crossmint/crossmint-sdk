---
"@crossmint/wallets-sdk": patch
---

refactor: introduce ChainAdapter to centralize per-chain behavior in wallet.ts

- `chains/chain-adapter.ts` + `chains/adapters/{evm,solana,stellar}.ts`: a `ChainAdapter` homing the per-chain switches (native token, wallet-locator prefix, signature support, add-signer chain + operation extraction, balance token fields)
- `wallet.ts` and `services/balance-formatter.ts` now dispatch through `getChainAdapter(chain)`; `getSignerRegistrationChain` and `isSolanaWallet` removed
- `PendingSignerOperation` type defined once in `wallets/types.ts`

Internal refactor — no behavior or public API changes.
