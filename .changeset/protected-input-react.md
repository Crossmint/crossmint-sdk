---
"@crossmint/client-sdk-react-ui": minor
---

Add `CrossmintProtectedInput`. It embeds the hosted protected-input page so a buyer can type the password of their account on a merchant site, and calls `onCreated` with an opaque `protectedInputId` to hand to Universal Checkout. The password and the vault token id never reach the developer's JavaScript. The buyer JWT is read from the Crossmint context.
