---
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-react-base": patch
---

Fix spurious 400 API call to empty device locator when no matching device key is found locally

Fix OTP dialog not appearing during recovery flow when using EVMWallet.from(wallet).sendTransaction(). The dialog's open condition previously required wallet.signer.type === "email", which fails during recovery because the wallet's public signer remains a device signer. Now uses the active auth signer info from the onAuthRequired callback instead.
