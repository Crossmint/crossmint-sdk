---
"@crossmint/client-sdk-react-base": patch
---

`useWallet().error` now preserves `CrossmintSDKError` codes (e.g. `wallet:signer-invalid`) instead of flattening them to `unknown`, unwraps the API error body's `message` field instead of surfacing raw JSON, and only reports a `TypeError` as `network` when it is a real fetch rejection. Concurrent `createWallet`/`getOrCreateWallet` calls are serialized: identical args share the in-flight request and different args queue behind it, so a second call in the same tick can no longer slip past the `in-progress` guard.
