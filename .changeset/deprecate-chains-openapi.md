---
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-base": patch
---

Remove the remaining deprecated chains from the wallets OpenAPI spec and the checkout order types.

PR #2074 removed the deprecated chains from the hand-written chain definitions. It did not touch
`packages/wallets/src/openapi.json` or the checkout `Order` types, so the chain names still reached
consumers through the generated API client. This completes that work.

Chains removed: Astar zkEVM, Boss, Coti, Hedera, Lightlink, Mode, Plume, Rari, Soneium, U2U, Viction,
World Chain, Xai, Zenchain, zKatana, zKyoto, Polygon Mumbai and the Goerli testnets.

Zora (`zora`, `zora-sepolia`) is unchanged.

`@crossmint/wallets-sdk` no longer accepts these chains in any request or response type.
`@crossmint/client-sdk-base` no longer lists them in the order payment-method and chain unions.
