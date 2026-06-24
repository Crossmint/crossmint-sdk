---
"@crossmint/wallets-sdk": patch
---

Fix Gmail dot normalization in signer locator construction. The backend normalizes Gmail addresses by stripping dots from the local part (e.g., `first.last@gmail.com` -> `firstlast@gmail.com`), but the SDK was using the raw email. This caused signer locator mismatches that blocked all outbound wallet operations (send, swap, transfer) for Gmail users with dots in their email address.
