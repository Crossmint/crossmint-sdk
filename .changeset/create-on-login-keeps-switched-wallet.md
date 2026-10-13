---
"@crossmint/client-sdk-react-base": patch
---

`createOnLogin` no longer overrides a wallet the app switched to with `getWallet` or `createWallet`. The provider ran `createOnLogin` again after every wallet change, which reloaded the `createOnLogin` chain and flipped the active wallet back; it now runs once per login and per `createOnLogin` value.
