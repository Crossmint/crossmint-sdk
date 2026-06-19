---
"@crossmint/wallets-sdk": patch
---

feat(wallets): add test coverage for email/phone as EVM delegated signers

Email and phone signers are now supported as delegated signers on EVM wallets (enabled by backend PR crossbit-main#26761). The SDK types and code paths already handled this correctly; this changeset adds unit tests verifying single, multiple, and mixed email/phone delegated signer scenarios for EVM wallet creation.
