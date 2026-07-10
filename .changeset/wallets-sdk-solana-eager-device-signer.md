---
"@crossmint/wallets-sdk": minor
---

Solana wallets now inject a device signer at creation time by default, reaching parity with EVM and Stellar. When `deviceSignerKeyStorage` is configured, `WalletFactory.createWallet` includes a `device` signer in the creation payload for every chain.

Because a Solana wallet's provider is only known server-side and some providers (e.g. Squads) reject device signers at creation with the stable `DEVICE_SIGNER_NOT_SUPPORTED` error code, creation is retried once without the device signer when that specific rejection occurs. Wallet creation therefore succeeds regardless of the backing provider; for providers without device-signer support, a device signer is registered post-creation via the wallet's existing recovery flow (or falls back to the recovery signer).

A device signer that the caller supplies explicitly is never stripped — a `DEVICE_SIGNER_NOT_SUPPORTED` rejection for an explicit signer surfaces as before. Behavior for EVM and Stellar is unchanged.
