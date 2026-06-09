---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-ui": patch
---

feat: block device signer on browsers without third-party storage partitioning

- `IframeDeviceSignerKeyStorage` now throws `UnsupportedBrowserError` in its constructor when the browser lacks third-party storage partitioning (Chrome < 115, Firefox < 103, or unknown browsers)
- `CrossmintWalletProvider` catches the error gracefully, logs it, and falls back to non-device signers
- Exports `hasPartitionedStorage()` utility so consumers can check browser support ahead of time
- Exports `UnsupportedBrowserError` for consumers to handle programmatically
