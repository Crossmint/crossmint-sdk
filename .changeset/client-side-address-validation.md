---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
---

Add client-side validation for recipient addresses in wallet.send(). Invalid addresses now throw an `InvalidAddressError` immediately instead of making a round-trip to the server.
