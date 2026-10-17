---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-native-ui": minor
---

React Native supports passkey signers on every chain. Install `react-native-passkey` (an optional peer dependency) and pass `passkeys={{ rpId, passkey: Passkey }}` to `CrossmintWalletProvider`: passkeys are then created and used through the platform passkey APIs. The wallets SDK takes a `passkeyProvider` wallet option for environments without the browser WebAuthn API, and passes the credential id to `onSignWithPasskey`.
