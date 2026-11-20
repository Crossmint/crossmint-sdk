---
"@crossmint/wallets-sdk": patch
---

Arc chain definitions: Arc Mainnet uses Circle's published RPC (`rpc.mainnet.arc.io`) and explorer (`explorer.arc.io`) instead of `arc-scan.org`, which no longer answers, so `getViemClient()` works on `arc`; Arc Testnet's native USDC has 18 decimals, not 6.
