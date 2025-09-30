---
"@crossmint/wallets-sdk": minor
---

Skip unnecessary polling when signature is already complete. For non-custodial wallets, the backend now returns completed signatures directly from createSignatureRequest(), allowing the SDK to return the signature immediately without waiting.
