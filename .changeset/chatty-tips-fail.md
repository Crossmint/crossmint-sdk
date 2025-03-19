---
"@crossmint/wallets-sdk": minor
---

- Adds `getWallet` function to retrieve existing (server) wallets
- Automatically creates a passkey credential when creating a new EVM smart wallet
- Adds optional `options` param to define wallet action callbacks
- Adds optional callbacks for signing and creating passkeys, enabling use outside browsers
