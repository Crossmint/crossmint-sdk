---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-react-native-ui": minor
"@crossmint/client-sdk-react-base": minor
---

feat: unify OTP signer API with useWalletOtpSigner hook

- Rename `sendEmailWithOtp` to `sendOtp` across the SDK to unify email and phone OTP signer APIs
- Add new `useWalletOtpSigner` hook in react-base, exported from both react-ui and react-native-ui
- Deprecate `useWalletEmailSigner` in react-native in favor of `useWalletOtpSigner`
