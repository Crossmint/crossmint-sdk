---
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-react-ui": patch
---

Device signer keys now stay available after a browser restart in Safari and all browsers on iOS. Before this change, these browsers deleted the key when they closed, and each restart added a new device signer. In these browsers, `CrossmintWalletProvider` now uses the new `IndexedDbDeviceSignerKeyStorage`, which keeps the key in the IndexedDB of your app's origin. Other browsers continue to use `IframeDeviceSignerKeyStorage`.
