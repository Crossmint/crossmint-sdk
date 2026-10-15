---
"@crossmint/client-sdk-base": minor
---

`Currency` now includes `cop`, `mxn`, `php`, `idr`, `thb`, `ngn` and `xcd`, the other fiat currencies that orders accept.

You can set one of them as `payment.fiat.defaultCurrency` on embedded or hosted checkout without a type cast. A currency must be enabled for your project before orders can use it.
