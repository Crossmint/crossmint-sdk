---
"@crossmint/wallets-playground-expo": patch
---

Load the default chain's wallet explicitly after login instead of through `createOnLogin`, so switching chains at runtime keeps the switched wallet active.
