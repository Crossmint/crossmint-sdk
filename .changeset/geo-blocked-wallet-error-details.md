---
"@crossmint/common-sdk-base": patch
"@crossmint/client-sdk-react-base": minor
---

Expose structured error details for failed wallet loads/creations so integrators can distinguish a permanent geo-block from a transient network failure.

`ApiClient.makeRequest` now throws a typed `ApiClientError` (carrying HTTP `status` and body) for any non-`ok` response whose body is not JSON — e.g. a Cloudflare 403 geo-block returning HTML — instead of letting callers hit an opaque `SyntaxError` from `.json()`. JSON 4xx responses are still passed through unchanged.

The wallet context now exposes an `error` field alongside `status`:

```ts
error: { code: "region-blocked" | "network" | "unknown"; status?: number; message: string } | null
```

403 maps to `region-blocked` (permanent, don't retry), while fetch rejects/timeouts, 5xx, and 429 map to `network` (transient, retryable). `getOrCreateWallet`'s auto-retry loop is gated so it no longer hammers a permanently region-blocked endpoint.
