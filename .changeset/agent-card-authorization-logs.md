---
"@crossmint/client-sdk-react-ui": patch
"@crossmint/common-sdk-base": patch
---

`CrossmintAgentCardAuthorization`, `OrderIntentVerification` and `CrossmintCvcRecollection` now send SDK logs to Crossmint for each step of the card authorization (start, order intent created, rail selected, verification started, succeeded, failed or abandoned, authorized). The logs carry ids and error types only, never card data, JWTs or keys. In the browser, SDK logs still waiting to be sent are now sent when the page is closed.
