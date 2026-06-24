---
"@crossmint/client-sdk-window": patch
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-react-base": patch
---

Recover the non-custodial signer OTP flow when the signer frame reloads between sending and verifying the code. This happens with the ephemeral iOS frame if the web content process is terminated mid-onboarding, which would otherwise lose the in-memory device and dead-end with an OTP error. The signer now detects the reload, requests a fresh code, and keeps the prompt open so the user can enter the new one.
