# @crossmint/expo-device-signer

## 0.1.0

### Minor Changes

- 02ac7bc: Add human-readable device name to device signers.

  - Added `name` field to `DeviceSignerConfig` and `DeviceSignerDescriptor`
  - Added abstract `getDeviceName()` method to `DeviceSignerKeyStorage`
  - `IframeDeviceSignerKeyStorage` derives the name from `navigator.userAgent` (e.g. "Chrome on Mac")
  - `NativeDeviceSignerKeyStorage` uses `expo-device` APIs for real native device names (e.g. "iPhone 15 (iOS)")
  - Both `registerSigners` (wallet creation) and `addSigner` (recovery) now send the device name to the API

### Patch Changes

- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
  - @crossmint/wallets-sdk@1.0.0

## 0.1.0-beta.4

### Patch Changes

- Updated dependencies [003e632]
- Updated dependencies [f5517fc]
- Updated dependencies [e38e91b]
- Updated dependencies [bac3bd4]
  - @crossmint/wallets-sdk@1.0.0-beta.6

## 0.1.0-beta.3

### Patch Changes

- Updated dependencies [2d92c5a]
- Updated dependencies [512015a]
- Updated dependencies [258779d]
- Updated dependencies [05f3feb]
  - @crossmint/wallets-sdk@1.0.0-beta.5

## 0.1.0-beta.2

### Patch Changes

- Updated dependencies [72a6c13]
- Updated dependencies [7f45e33]
  - @crossmint/wallets-sdk@1.0.0-beta.4

## 0.1.0-beta.1

### Minor Changes

- d5c0df7: Add human-readable device name to device signers.

  - Added `name` field to `DeviceSignerConfig` and `DeviceSignerDescriptor`
  - Added abstract `getDeviceName()` method to `DeviceSignerKeyStorage`
  - `IframeDeviceSignerKeyStorage` derives the name from `navigator.userAgent` (e.g. "Chrome on Mac")
  - `NativeDeviceSignerKeyStorage` uses `expo-device` APIs for real native device names (e.g. "iPhone 15 (iOS)")
  - Both `registerSigners` (wallet creation) and `addSigner` (recovery) now send the device name to the API

### Patch Changes

- Updated dependencies [4e5bc75]
- Updated dependencies [d5c0df7]
- Updated dependencies [d66aacc]
- Updated dependencies [116111d]
- Updated dependencies [5ae2806]
- Updated dependencies [6eb5217]
- Updated dependencies [d0c8820]
- Updated dependencies [6038b09]
- Updated dependencies [09e9ce2]
  - @crossmint/wallets-sdk@1.0.0-beta.3

## 0.0.2-beta.0

### Patch Changes

- Updated dependencies [d09537e]
- Updated dependencies [534e27d]
  - @crossmint/wallets-sdk@1.0.0-beta.2
