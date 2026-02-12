---
"@crossmint/wallets-sdk": minor
---

Add chain environment validation for EVM wallets

When creating or fetching an EVM wallet, the SDK now validates that the chain matches the environment:
- Production environment: Only mainnet chains are allowed
This prevents accidental use of testnet chains in production or mainnet chains in non-production environments. A warning is logged with a descriptive message when there is a mismatch, but the wallet operation still completes successfully.

Category: improvements
Product Area: wallets
