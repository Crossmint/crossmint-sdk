---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": patch
---

`OrderIntentRail` is now a union of `agentic-token`, `encrypted-card`, and `spt` rails, matching the order-intent API. Narrow on `rail` before reading `provider`; `OrderIntentVerification` keeps verifying the pending `agentic-token` rail.
