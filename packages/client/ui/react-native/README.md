# @crossmint/client-sdk-react-native-ui

React Native SDK for integrating [Crossmint Wallets](https://docs.crossmint.com) into your mobile application. Provides providers, hooks, and built-in UI for wallet creation, signing, and OTP verification.

## Prerequisites

Get a **client** API key from the [Crossmint developer console](https://docs.crossmint.com/introduction/platform/api-keys). Ensure your key has the **Wallet API** scopes enabled, including `wallets.fund` for `stagingFund`.

## Installation

```bash
npx expo install @crossmint/client-sdk-react-native-ui@v1
```

This is the 1.x maintenance line, for apps on Expo SDK 54 to 57. It keeps getting fixes. Apps on Expo SDK 58 or later use 2.x (`@crossmint/client-sdk-react-native-ui@latest`).

## Quick Start

### 1. Setup Providers

**With Crossmint Auth (default in staging)**

```tsx
import {
  CrossmintProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";

export default function App() {
  return (
    <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY}>
      <CrossmintAuthProvider>
        <CrossmintWalletProvider
          createOnLogin={{
            chain: "base-sepolia",
            recoveryMethods: [{ type: "email" }],
          }}
        >
          <MainApp />
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
```

**Bring Your Own Authentication**

Use this when your app already has an auth provider, and in production: connect your provider and configure [JWT Authentication](https://docs.crossmint.com/introduction/platform/api-keys/jwt-authentication) in the Crossmint Console (see [Move to Production](https://docs.crossmint.com/wallets/guides/crossmint-auth#move-to-production)). Then skip `CrossmintAuthProvider` and pass your provider's JWT to the wallets SDK. See the [Custom Auth Guide](https://docs.crossmint.com/wallets/guides/bring-your-own-auth#react-native) for full details.

```tsx
import {
  CrossmintProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";

export default function App() {
  return (
    <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY}>
      <CrossmintWalletProvider
        createOnLogin={{
          chain: "base-sepolia",
          recoveryMethods: [
            {
              type: "email",
              email: "user@example.com",
            },
          ],
        }}
      >
        <MainApp />
      </CrossmintWalletProvider>
    </CrossmintProvider>
  );
}
```

### 2. Use Wallets

```tsx
import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { View, Text, TouchableOpacity } from "react-native";

function WalletActions() {
  const { wallet, status } = useWallet();

  if (status === "in-progress") return <Text>Loading wallet...</Text>;
  if (!wallet) return <Text>No wallet</Text>;

  // Staging only: mints USDXM, Crossmint's test stablecoin, into the wallet
  const handleFund = async () => {
    await wallet.stagingFund(10);
  };

  const handleSend = async () => {
    const tx = await wallet.send("0xRecipient", "usdxm", "10");
    console.log("Transaction:", tx.explorerLink);
  };

  return (
    <View>
      <Text>Wallet: {wallet.address}</Text>
      <TouchableOpacity onPress={handleFund}>
        <Text>Get 10 USDXM</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSend}>
        <Text>Send 10 USDXM</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Providers

| Provider | Purpose |
|---|---|
| `CrossmintProvider` | Root provider. Required for all Crossmint features. |
| `CrossmintAuthProvider` | Authentication (OAuth). Optional if using your own auth. |
| `CrossmintWalletProvider` | Wallet creation, device signer management, and OTP UI. |

### `CrossmintWalletProvider` Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `createOnLogin` | `CreateOnLogin` | — | Auto-create wallet on auth. Uses `recovery` or `recoveryMethods` + optional `signers`. |
| `showOtpSignerPrompt` | `boolean` | `true` | When `true` (default), built-in OTP dialogs are shown during signing flows. Set to `false` to suppress them and handle OTP manually via `useWalletOtpSigner()`. |
| `deviceSignerKeyStorage` | `DeviceSignerKeyStorage` | — | Override the default native key storage. |
| `passkeys` | `NativePasskeyConfig` | — | Enables passkey signers on every chain: `{ rpId, rpName?, passkey: Passkey }`, with `Passkey` from `react-native-passkey`. Requires an app associated with `rpId` (iOS `webcredentials:` associated domain, Android Digital Asset Links) and a development build, since Expo Go cannot run native modules. Keep `rpId` fixed once users have created passkeys. Without this prop, passkey signers are rejected. |
| `appearance` | `UIConfig` | — | Styling for built-in UI components. |

## Hooks

### `useWallet()`

Returns the wallet instance and management functions:

```tsx
const {
  wallet,              // Wallet | undefined
  status,              // "not-loaded" | "in-progress" | "loaded" | "error"
  getWallet,           // (props: { chain, alias? }) => Promise<Wallet | undefined>
  createWallet,        // (props: ClientSideWalletCreateArgs) => Promise<Wallet | undefined>
  createDeviceSigner,  // () => Promise<DeviceSignerDescriptor> | undefined
  createPasskeySigner, // (name: string) => Promise<RegisterSignerPasskeyParams>
} = useWallet();
```

### `useWalletOtpSigner()`

For custom OTP UI when using email/phone recovery methods. When `showOtpSignerPrompt` is set to `false`, use this hook to handle OTP flows manually:

```tsx
const { needsAuth, sendOtp, verifyOtp, reject } = useWalletOtpSigner();
```

### `useCrossmintAuth()`

Authentication state and OAuth login:

```tsx
const { loginWithOAuth, logout, user } = useCrossmintAuth();

// OAuth providers
loginWithOAuth("google");
loginWithOAuth("twitter");
```

## Components

### `ExportPrivateKeyButton`

Renders a button to export the wallet's private key via TEE. Only renders for email/phone signers.

```tsx
import { ExportPrivateKeyButton } from "@crossmint/client-sdk-react-native-ui";

<ExportPrivateKeyButton appearance={{ borderRadius: "12px" }} />
```

## Differences from React SDK

| Feature | React | React Native |
|---|---|---|
| Device signer storage | Browser iframe (`IframeDeviceSignerKeyStorage`) | Native secure storage (iOS Secure Enclave / Android Keystore) |
| Device storage override | Not exposed | `deviceSignerKeyStorage` prop on provider |
| Built-in OTP UI | Always rendered | `showOtpSignerPrompt=true` (shown by default) |
| Passkey helper UI | `showPasskeyHelpers` prop | Not available |
| TEE communication | Hidden iframe | Hidden WebView (lazily initialized) |

## Wallets SDK

The `wallet` object returned by `useWallet()` is a [`Wallet`](https://www.npmjs.com/package/@crossmint/wallets-sdk) instance. For wallet method documentation (send, balances, sign, etc.), see the [`@crossmint/wallets-sdk` README](https://www.npmjs.com/package/@crossmint/wallets-sdk).

## Environment Setup

1. Get your API key from [Crossmint Console](https://staging.crossmint.com/console/projects/apiKeys)

2. Add to your `.env`:
```bash
EXPO_PUBLIC_CROSSMINT_API_KEY=your_api_key_here
```

3. Configure deep linking in `app.json`:
```json
{
  "expo": {
    "scheme": "your-app-scheme"
  }
}
```

## Documentation

- [Crossmint Wallets Docs](https://docs.crossmint.com)
- [SDK Reference](https://docs.crossmint.com/sdk-reference/wallets/react-native)
- [Wallets Expo Quickstart](https://github.com/Crossmint/wallets-expo-quickstart)
- [Custom Auth Guide (React Native)](https://docs.crossmint.com/wallets/guides/bring-your-own-auth#react-native)

## License

Apache-2.0
