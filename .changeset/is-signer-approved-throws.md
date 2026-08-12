---
"@crossmint/wallets-sdk": patch
---

`wallet.isSignerApproved` now throws when the signer state cannot be fetched instead of resolving to `false`, so callers can tell a failed request apart from a signer that is not approved. A signer that is not registered still resolves to `false`. This matches the behavior of the Swift and Kotlin SDKs.
