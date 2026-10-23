---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-native-ui": patch
---

The SDK now removes stale device signers. A device signer becomes stale when the device loses its key and registers a new signer.

- The SDK saves the locator of each device signer that it registers.
- After the device registers a new signer, the SDK removes the signer with the saved locator.
- If the wallet is at its signer limit, the SDK removes the least recently active device signer. Then the SDK registers the new signer.
- The SDK does not remove a device signer only because the signer name matches the device name.

`addSigner` now throws `SignerLimitExceededError` when the wallet is at its signer limit. `SignerLimitExceededError` extends `InvalidSignerError`, so existing error handling continues to work.

`DeviceSignerKeyStorage` has two new optional methods: `saveSignerLocator` and `getSavedSignerLocator`.
