---
"@crossmint/common-sdk-base": patch
"@crossmint/client-sdk-react-base": patch
---

Treat HTTP 451 (Unavailable For Legal Reasons) responses as a region block.

`ApiClient.makeRequest` now throws an `ApiClientError` for a 451 whatever its content type. Before, a 451 labelled `application/json` was passed to `.json()`, and a body that was not valid JSON raised an opaque `SyntaxError` (for example `JSON Parse error: Expect a string key in JSON object` on React Native). The wallet provider now maps a 451 to the `region-blocked` error code, so the load is not retried and integrators can show a clear message.
