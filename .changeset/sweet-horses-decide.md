---
"@crossmint/wallets-sdk": patch
---

Fix approval signer locator bug: use correct signer's locator in approval submissions instead of always using this.signer.locator(). This makes the additionalSigners option work correctly for delegated signers.
