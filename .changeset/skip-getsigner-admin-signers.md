---
"@crossmint/wallets-sdk": patch
---

Skip unnecessary getSigner API call for admin/recovery signers in useSigner. Admin signers are always approved and the getSigner endpoint only works for delegated signers (returns 404/400 for admin signers). The signer status is now set to "active" directly for admin signers.
