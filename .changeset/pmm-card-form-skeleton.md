---
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintPaymentMethodManagement` shows the card form's empty fields, in its appearance, while the form loads, instead of rendering nothing until the iframe draws. It shows them only when the form opens on a new card: not with `allowedModes` including `"existing"`, or when bank accounts come first.
