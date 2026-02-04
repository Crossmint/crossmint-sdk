---
"@crossmint/wallets-sdk": minor
---

Add chain environment validation for EVM wallets

When creating or fetching an EVM wallet, the SDK now validates that the chain matches the environment:
- Production environment: Only mainnet chains are allowed
- Staging/Development environments: Only testnet chains are allowed

This prevents accidental use of testnet chains in production or mainnet chains in non-production environments. An InvalidEnvironmentError is thrown with a descriptive message when there is a mismatch.

Category: improvements
Product Area: wallets
