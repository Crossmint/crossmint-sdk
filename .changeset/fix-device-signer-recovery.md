---
"@crossmint/wallets-sdk": patch
---

Fix device signer recovery when local key lookup fails

- Prevent assembling a device signer with an empty locator when `getKey()` returns null during initialization
- Make `recover()` search all registered device signers for a local key match before generating a new one
- Make "already approved" error detection more robust with looser string matching
- Extract `resumePendingDeviceSignerApproval` and `findLocalDeviceSigner` helpers for clarity
