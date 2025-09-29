Wallets E2E

Setup
1) pnpm install
2) pnpm build:libs
3) Copy packages/wallets/e2e/.env.example to packages/wallets/e2e/.env and set:
   - CROSSMINT_STAGING_API_KEY=...

Run
- pnpm -w --filter @crossmint/wallets-sdk run test:e2e
- pnpm -w --filter @crossmint/wallets-sdk run test:e2e:ui

Notes
- Tests hit Crossmint staging using your API key.
- Default chain is base-sepolia and signer is api-key.
