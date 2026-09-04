---
"@crossmint/wallets-sdk": patch
---

Automatically stringify bigint values in `signTypedData` message before sending to the API. This removes the need for consumers to manually convert bigint fields (e.g., amounts, nonces, deadlines) in EIP-712 typed data.
