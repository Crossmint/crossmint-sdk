---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
---

Throw `DeviceSignerRotatedError` (code `wallet:signer-rotated`) instead of generic `InvalidSignerError` when a pending approval requires a device signer that was rotated via recovery. The new error includes both the expected and actual signer locators and guides the developer to re-create the transaction.
