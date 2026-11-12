---
"@crossmint/wallets-sdk": patch
---

Queue `request:sign` calls per email/phone signer so a transaction that needs several approvals from the same signer (e.g. a Stellar card-funded transfer) no longer submits the first signature for every approval.
