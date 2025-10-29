---
"@crossmint/wallets-sdk": patch
---

Fix email signer validation to normalize Gmail addresses before comparison. Users with dotted Gmail addresses (e.g., jer.coffey@gmail.com) can now retrieve wallets without validation errors.
