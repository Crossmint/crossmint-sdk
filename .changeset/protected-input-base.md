---
"@crossmint/client-sdk-base": minor
---

Add the `CrossmintProtectedInputProps` type, the `protected-input:created` / `protected-input:error` / `ui:height.changed` event schemas, the `ProtectedInputCreated` and `ProtectedInputError` types, and `createProtectedInputService`, which builds the URL of the hosted `/sdk/unstable/protected-input` page and opens the iframe channel to it. These back the `CrossmintProtectedInput` React component.
