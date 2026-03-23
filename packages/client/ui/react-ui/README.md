# Crossmint React SDK

React SDK for integrating [Crossmint Wallets](https://docs.crossmint.com) into your application. Provides providers, hooks, and built-in UI for wallet creation, signing, OTP verification, and passkey flows.

## Prerequisites

Get a **client** API key from the [Crossmint developer console](https://docs.crossmint.com/introduction/platform/api-keys). Ensure your key has the **Wallet API** scopes enabled.

## Installation

```bash
npm install @crossmint/client-sdk-react-ui
# or
pnpm add @crossmint/client-sdk-react-ui
# or
yarn add @crossmint/client-sdk-react-ui
```

## Quick Start

### 1. Setup Providers

**With Crossmint Authentication (Recommended for quickstarts only)**

```tsx
"use client";

import {
  CrossmintProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-ui";

export default function App({ children }) {
  return (
    <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY}>
      <CrossmintAuthProvider>
        <CrossmintWalletProvider
          createOnLogin={{
            chain: "base-sepolia",
            recovery: { type: "email" },
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
```

**Bring Your Own Authentication**

Already have authentication? Skip `CrossmintAuthProvider` and use wallets with your existing auth system. See the [Custom Auth Guide](https://docs.crossmint.com/wallets/advanced/bring-your-own-auth) for full details.

```tsx
"use client";

import {
  CrossmintProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-ui";

export default function App({ children }) {
  return (
    <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY}>
      <CrossmintWalletProvider
        createOnLogin={{
          chain: "base-sepolia",
          recovery: {
            type: "email",
            email: "user@example.com",
          },
        }}
      >
        {children}
      </CrossmintWalletProvider>
    </CrossmintProvider>
  );
}
```

### 2. Use Wallets

```tsx
import { useWallet } from "@crossmint/client-sdk-react-ui";

function WalletActions() {
  const { wallet, status } = useWallet();

  if (status === "in-progress") return <p>Loading wallet...</p>;
  if (!wallet) return <p>No wallet</p>;

  const handleSend = async () => {
    const tx = await wallet.send("0xRecipient", "usdc", "10");
    console.log("Transaction:", tx.explorerLink);
  };

  return (
    <div>
      <p>Wallet: {wallet.address}</p>
      <button onClick={handleSend}>Send 10 USDC</button>
    </div>
  );
}
```

## Providers

| Provider | Purpose |
|---|---|
| `CrossmintProvider` | Root provider. Required for all Crossmint features. |
| `CrossmintAuthProvider` | Authentication (email OTP, Google, Twitter/X). Optional if using your own auth. |
| `CrossmintWalletProvider` | Wallet creation, device signer management, and built-in OTP/passkey UI. |

### `createOnLogin` Configuration

When `createOnLogin` is set on `CrossmintWalletProvider`, a wallet is automatically created when the user logs in:

```tsx
<CrossmintWalletProvider
  createOnLogin={{
    chain: "base-sepolia",       // required — the blockchain
    recovery: { type: "email" }, // required — recovery signer config
    signers: [{ type: "device" }], // optional — defaults to device signer
  }}
>
```

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

For custom OTP UI when using email/phone recovery signers:

```tsx
const { needsAuth, sendOtp, verifyOtp, reject } = useWalletOtpSigner();
```

### `useAuth()`

Authentication state and login methods:

```tsx
const { login, logout, user, status } = useAuth();
```

## Components

### `ExportPrivateKeyButton`

Renders a button to export the wallet's private key via TEE. Only renders for email/phone signers.

```tsx
import { ExportPrivateKeyButton } from "@crossmint/client-sdk-react-ui";

<ExportPrivateKeyButton appearance={{ borderRadius: "12px" }} />
```

## React Native

For React Native apps, see [`@crossmint/client-sdk-react-native-ui`](https://www.npmjs.com/package/@crossmint/client-sdk-react-native-ui).

## Wallets SDK

The `wallet` object returned by `useWallet()` is a [`Wallet`](https://www.npmjs.com/package/@crossmint/wallets-sdk) instance. For wallet method documentation (send, balances, sign, etc.), see the [`@crossmint/wallets-sdk` README](https://www.npmjs.com/package/@crossmint/wallets-sdk).

## Documentation

- [Crossmint Wallets Docs](https://docs.crossmint.com)
- [SDK Reference](https://docs.crossmint.com/sdk-reference/wallets/react)
- [Custom Auth Guide](https://docs.crossmint.com/wallets/advanced/bring-your-own-auth)

## SDK Reference Docs Generation

```
Source JSDoc -> TypeDoc -> api.json -+
                                    +-> generate-reference.mjs -> MDX pages (docs/<product>/)
                     examples.json -+
```

Run with `pnpm generate:docs` or `node scripts/generate-reference.mjs --product wallets`.

## License

Apache-2.0
