---
"@crossmint/client-sdk-base": major
"@crossmint/client-sdk-react-ui": minor
---

Add `CrossmintCvcRecollection`. Render it when an order intent's `encrypted-card` rail reports `status: "pending_cvc_recollection"`; it loads the hosted CVC recollection page and calls `onComplete` once the vault holds a fresh CVC. `OrderIntentEncryptedCardRail.status` is no longer the literal `"active"`: it is now `"active" | "pending_cvc_recollection" | "error"`, so code that narrowed on `"active"` alone must handle the new states.
