---
"@crossmint/wallets-sdk": patch
---

Validate transfer amount in wallet.send() to reject zero, negative, and non-numeric values before sending on-chain. Throws InvalidTransferAmountError for invalid amounts.
