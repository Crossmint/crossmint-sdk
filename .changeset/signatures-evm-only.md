---
"@crossmint/wallets-sdk": patch
---

fix: block signature approval on Stellar wallets (EVM-only)

Message signing/approval is only implemented for EVM smart wallets: there is no
signature-creation entry point for Stellar (only `EVMWallet` exposes
`signMessage`/`signTypedData`), and the Stellar external-wallet and non-custodial
signers reject `signMessage`. The approval guard previously blocked only Solana,
letting Stellar fall through to an unusable path. It now blocks Stellar too, so
`approve({ signatureId })` on a Stellar wallet throws the accurate
"Approving signatures is only supported for EVM smart wallets" error.
