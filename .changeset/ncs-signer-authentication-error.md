---
"@crossmint/wallets-sdk": patch
---

Email/phone signers now throw a new `SignerAuthenticationError` when the Crossmint JWT is missing, empty or rejected by the backend, instead of sending an empty `Authorization` header and surfacing the resulting `HTTP 401` as an opaque `OtpValidationError`/`SignerStatusError`. A missing JWT fails before the signer frame is contacted (`code: "jwt-required"`), so integrators can prompt the user to re-authenticate rather than retry the OTP.
