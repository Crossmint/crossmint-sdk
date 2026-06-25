---
"@crossmint/wallets-sdk": patch
---

fix: `signers()` error names the unsupported chain type instead of the wallet type

When a smart wallet has an unsupported `chainType`, `signers()` now throws
`Wallet chain type <chainType> not supported` instead of the misleading
`Wallet type smart not supported`. The supported-chain check is also now driven
by the chain adapter registry rather than hard-coded chain literals.
