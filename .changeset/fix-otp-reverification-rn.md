---
"@crossmint/wallets-sdk": patch
---

fix: cache auth status in NonCustodialSigner to prevent repeated OTP prompts on React Native

Added a timestamp-based cache (10-min TTL) in `handleAuthRequired()` that short-circuits
the `get-status` round-trip to the frame when the signer was recently confirmed as ready.
This prevents unnecessary OTP re-prompts caused by frame cache expiry or JWT token refresh.
