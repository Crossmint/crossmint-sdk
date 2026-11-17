---
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintPaymentMethodManagement` shows pulsing placeholders of the iframe's first screen, in its appearance, while it loads, instead of rendering nothing until the iframe draws: the card form's fields, or with `allowedModes` including `"existing"`, the choice between a saved method and a new one. When bank accounts come first and saved methods are not allowed, it shows none.
