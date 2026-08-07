---
"@crossmint/wallets-sdk": patch
---

Fix stale JWT during NCS signer recovery by reading `crossmint.jwt` through a live getter and retrying `get-status`/`start-onboarding`/`complete-onboarding` once when the JWT changes while a request is in flight. Also wire `throwIfCrossmintApiAuthError` so `JWTExpiredError` is surfaced when the signer frame reports `ERROR_JWT_EXPIRED`.
