---
"@crossmint/client-sdk-react-base": patch
---

`createOnLogin` no longer overrides a wallet the app switched to with `getWallet` or `createWallet`. The provider ran `createOnLogin` again after every wallet change, which reloaded the `createOnLogin` chain and flipped the active wallet back. It now runs once per login and per `createOnLogin` value; a JWT refresh does not re-run it, and after a failed load a new JWT still retries.
