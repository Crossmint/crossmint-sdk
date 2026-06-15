---
"@crossmint/wallets-sdk": patch
---

refactor: extract balance formatting and recipient/token locators from wallet.ts

- `services/balance-formatter.ts`: `formatBalanceResponse` (moved from `Wallet.transformBalanceResponse`)
- `utils/locators.ts`: `toRecipientLocator` / `toTokenLocator`

Internal refactor — no behavior or public API changes.
