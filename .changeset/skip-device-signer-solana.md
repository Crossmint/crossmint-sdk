---
"@crossmint/wallets-sdk": patch
---

Skip automatic device signer injection for Solana wallets during wallet creation. Device signers are not yet broadly supported on Solana (only available for swig/crossmint provider wallets), so the SDK no longer automatically adds them for Solana chains.
