---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-react-native-ui": minor
---

`CrossmintIdentityVerification` supports the Crossmint verification flow and takes an `appearance` prop.

- `IdentityVerificationCredentials` now also has the session shape `{ verificationId, clientSecret, deviceSessionKey? }`, which an order carries when it uses the Crossmint verification flow. Pass the credentials through as they come. TypeScript code that reads `credentials.inquiryId` must first check for `"provider" in credentials`.
- New `appearance` prop: embedded checkout's appearance object plus an optional `theme` (`"light"` or `"dark"`). Without `theme`, the flow reads light or dark from `variables.colors.backgroundPrimary`.
- `@crossmint/client-sdk-react-ui` now exports `CrossmintIdentityVerificationProps`, `IdentityVerificationAppearance`, `IdentityVerificationCredentials`, `IdentityVerificationStatus` and `IdentityVerificationError`.
