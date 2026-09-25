---
"@crossmint/client-sdk-react-ui": minor
---

Add the `useProtectedInputs(jwt)` and `useOrderIntents(jwt)` hooks, which act as the buyer named by `jwt` (the same token the components take), to list, read and revoke protected inputs and to read or cancel order intents after `CrossmintProtectedInput` or `CrossmintAgentCardAuthorization` reported an id. Re-export the `ProtectedInput`, `ProtectedInputStatus` and `OrderIntent` types.
