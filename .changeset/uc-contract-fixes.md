---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintAgentCardAuthorization` no longer requires `merchant` and omits it from the order intent when unset: Agent Checkouts bind the merchant when they request the credential, so an order intent for a checkout run carries none.
