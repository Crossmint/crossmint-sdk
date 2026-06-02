---
"@crossmint/wallets-sdk": patch
---

fix: preserve OTP validation failure reason instead of collapsing into generic internal error

- Add `OtpValidationError` class (exported) so consumers can distinguish OTP failures from other signer errors
- `verifyOtp` and `sendMessageWithOtp` now throw `OtpValidationError` with the error code from the TEE response
- `recover()` handles `OtpValidationError` like `AuthRejectedError`: preserves the local device key so the user can retry the OTP flow without re-registering the signer

