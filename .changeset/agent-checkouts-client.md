---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

Add an experimental agent-checkouts client: `createAgentCheckoutsApi` in `@crossmint/client-sdk-base` and the `useCrossmintAgentCheckouts` hook in `@crossmint/client-sdk-react-ui`. It creates, lists, reads and cancels agent checkouts, reads and sends their messages, streams their progress with reconnects (`streamMessages`), and manages buyer and browser profiles, all with the client API key and the buyer's JWT.
