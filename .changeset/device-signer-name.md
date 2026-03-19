---
"@crossmint/wallets-sdk": minor
"@crossmint/expo-device-signer": minor
---

Add human-readable device name to device signers.

- Added `name` field to `DeviceSignerConfig` and `DeviceSignerDescriptor`
- Added abstract `getDeviceName()` method to `DeviceSignerKeyStorage`
- `IframeDeviceSignerKeyStorage` derives the name from `navigator.userAgent` (e.g. "Chrome on Mac")
- `NativeDeviceSignerKeyStorage` uses `expo-device` APIs for real native device names (e.g. "iPhone 15 (iOS)")
- Both `registerSigners` (wallet creation) and `addSigner` (recovery) now send the device name to the API
