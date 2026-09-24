---
"@crossmint/client-sdk-base": minor
---

Add `createOrderIntentsApi`, which wraps the buyer-JWT order-intent registration and order-intent routes under `/api/unstable` and validates their responses with zod, plus the `CrossmintAgentCardAuthorizationProps`, `AgentCardAuthorizationResult` and `AgentCardAuthorizationError` types that `CrossmintAgentCardAuthorization` will use. `OrderIntent` gains an optional `merchant`.
