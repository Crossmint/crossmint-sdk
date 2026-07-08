---
"@crossmint/common-sdk-base": minor
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-base": patch
---

Surface authentication failures (e.g. expired JWTs) from `wallet.approve` and transaction/signature polling instead of masking them behind generic `wallet:no-transaction` / `wallet:no-signature` errors. When the API responds with an auth error code, the SDK now throws a typed `JWTExpiredError` (carrying `expiredAt`), `JWTInvalidError`, `JWTDecryptionError`, `JWTIdentifierError`, or `NotAuthorizedError`.

The canonical auth error classes now live in `@crossmint/common-sdk-base` and are re-exported from `@crossmint/client-sdk-base` and `@crossmint/wallets-sdk`, so `instanceof` checks work across packages. `client-sdk-base`'s `APIErrorService` also now maps the correct backend identifier code (`ERROR_JWT_IDENTIFIER_ERROR`) and handles `ERROR_JWT_AUDIENCE_MISMATCH`.
