---
"@crossmint/wallets-sdk": minor
---

Surface authentication failures (e.g. expired JWTs) from `wallet.approve` and transaction/signature polling instead of masking them behind generic `wallet:no-transaction` / `wallet:no-signature` errors. When the API responds with an auth error code, the SDK now throws a typed `JWTExpiredError` (carrying `expiredAt`), `JWTInvalidError`, `JWTDecryptionError`, `JWTIdentifierError`, or `NotAuthorizedError`, all exported from the package root.
