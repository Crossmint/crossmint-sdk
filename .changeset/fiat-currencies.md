---
"@crossmint/client-sdk-base": minor
---

`Currency` and the `Order` type now include `mxn` and `xcd`, which card payments accept.

You can set one of them as `payment.fiat.defaultCurrency` on embedded or hosted checkout without a type cast, and orders priced in them type-check. A currency must be enabled for your project before orders can use it.
