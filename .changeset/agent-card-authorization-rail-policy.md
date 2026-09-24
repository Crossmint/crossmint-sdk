---
"@crossmint/client-sdk-base": minor
---

Add `selectCardRail` (the deterministic card rail policy behind `CrossmintAgentCardAuthorization`: `agentic-token`/`vic` with a `card` credential format, then `agentic-token`/`agentpay`, then `encrypted-card`, skipping rails in error), `findCardRail`, `toAgentCardRail`, `needsOrderIntentRegistration`, and `toAgentCardPaymentMethodSummary`, which reduces a selected card to id, brand and last4 and strips `card.source`.
