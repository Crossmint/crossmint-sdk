---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-native-ui": patch
---

Remove stale device signers when a device registers a new one. The SDK now saves the locator of the device signer it registers, and removes that signer after the device loses its key and registers a new one. If the wallet is at its signer limit, the SDK removes the device signer that was least recently active, then registers the new one. The SDK no longer removes a device signer based on its name only.

`addSigner` now throws `SignerLimitExceededError` when the wallet is at its signer limit. `DeviceSignerKeyStorage` has two new optional methods, `saveSignerLocator` and `getSavedSignerLocator`.
