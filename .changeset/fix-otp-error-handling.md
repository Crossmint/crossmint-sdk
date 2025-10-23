---
"@crossmint/client-sdk-wallets": patch
"@crossmint/client-sdk-react-ui": patch
---

Fix OTP verification error handling to properly propagate errors to UI. When users entered an incorrect OTP or hit rate limits, errors are now properly displayed instead of silently restarting the auth flow.
