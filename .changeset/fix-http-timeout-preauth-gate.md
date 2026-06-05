---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
---

fix: add default 30s HTTP timeout to ApiClient and gate preAuthIfNeeded on prepareOnly in wallet.send()

- ApiClient.makeRequest() now uses `AbortSignal.timeout(30_000)` by default so requests that never receive a response will reject after 30 seconds instead of hanging indefinitely. Callers can override by passing their own `signal` in `RequestInit`. Timeout rejections are wrapped in a typed `ApiRequestTimeoutError`.
- `wallet.send()` no longer calls `preAuthIfNeeded()` when `prepareOnly` is `true`, preventing unnecessary signer pre-authorization that could stall the call before the HTTP request fires.
