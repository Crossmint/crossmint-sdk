---
"@crossmint/wallets-sdk": patch
---

WAL-10669: validate the transfer amount in `send()` before resolving the chain so an invalid amount no longer remaps `wallet.chain`
