---
"@crossmint/wallets-sdk": patch
---

Remove chains parameter from balances() method - the wallet's default chain is now always used for balance queries, fixing a bug where passed chains were ignored during response processing.
