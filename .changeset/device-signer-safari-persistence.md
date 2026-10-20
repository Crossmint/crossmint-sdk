---
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-react-ui": patch
---

Keep device signer keys after a browser restart in Safari, all iOS browsers, and Brave. These browsers delete the storage of iframes from another origin when the browser closes, so the device key was lost and each restart registered a new device signer. `CrossmintWalletProvider` now stores the key in the IndexedDB of the page's own origin in these browsers, with the new `IndexedDbDeviceSignerKeyStorage`. The key is non-extractable. Other browsers keep using `IframeDeviceSignerKeyStorage`.
