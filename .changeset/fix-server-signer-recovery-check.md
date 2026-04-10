---
"@crossmint/wallets-sdk": patch
---

Fix TypeError in `isRecoverySigner` when recovery config from API lacks `secret` field

When calling `wallet.useSigner({ type: "server", secret: "xmsk1_..." })` on a wallet fetched via `getWallet`, the `isRecoverySigner()` method would call `deriveServerSignerDetails()` on the API-sourced recovery config which has shape `{type: "server", address: "..."}` without a `secret` field. This caused `stripAndValidateSecret(undefined)` to throw `TypeError: Cannot read properties of undefined (reading 'startsWith')`.

The fix uses the `address` field from the API recovery config directly instead of attempting to re-derive it from a non-existent secret.
