---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintPaymentMethodManagement` accepts `children`: with `hideSubmitButton`, render your own submit button as children and the "Powered by Crossmint" footer moves out of the iframe to below it. The SDK sends `footer=host` and draws the footer once the iframe confirms it hid its own (`ui:poweredBy.delegated`), so every old/new SDK and iframe combination keeps exactly one footer.
