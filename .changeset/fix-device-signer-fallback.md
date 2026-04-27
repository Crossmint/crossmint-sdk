---
"@crossmint/wallets-sdk": patch
---

Fix wallet initialization to fall back to email/recovery signer when device signer is unavailable (e.g. Safari ITP blocking devicekey.store iframe). Previously, initDefaultSigner() returned early when needsRecovery was true, skipping the email signer fallback path entirely. Also adds a 10-second timeout to device signer initialization to prevent 60-second hangs when the iframe is blocked.
