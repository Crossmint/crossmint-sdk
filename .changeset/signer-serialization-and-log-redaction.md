---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
---

Keep signing keys and session credentials out of application logs. `wallet.signer` no longer exposes key material or the session JWT and API key to `console.log`, `util.inspect` or `JSON.stringify`: Solana and Stellar server signers and email and phone signers now hold them in private class fields. The SDK logger now also redacts compound key names (such as `serverSecret`, `privateKeyHex`, `seed`, `mnemonic` and `keyBytes`), replaces values nested deeper than its redaction limit with `[TRUNCATED]`, and redacts log calls made before the logger is initialized.
