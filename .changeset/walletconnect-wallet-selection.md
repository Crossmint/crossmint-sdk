---
"@crossmint/client-sdk-walletconnect": patch
---

A session request now goes to the wallet that owns the requested address on the requested chain. Before, the first wallet signed every request, because `wallets.find` got a Promise from its async callback. EVM addresses match without regard to case. The package now uses `@reown/walletkit@1.4.1` in place of `@walletconnect/web3wallet@1.10.1`. The old `@walletconnect/sign-client@2.11.1` did not await its request check, so a dApp could send a chain or a method that the session did not approve. With `@walletconnect/sign-client@2.23.0`, the dApp gets an error for such a request, and the wallet does not see it.
