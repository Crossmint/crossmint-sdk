<div align="center">
  <h1 align="center">Crossmint React Native SDK</h1>

  <p align="center">
    Create chain-agnostic wallets for your React Native apps in minutes
    <br />
    <a href="https://docs.crossmint.com/wallets/quickstarts/react-native"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/Crossmint/wallets-expo-quickstart">View Demo</a>
    ·
    <a href="https://github.com/Crossmint/crossmint-sdk/issues">Report Bug</a>
    ·
    <a href="https://github.com/Crossmint/crossmint-sdk/issues">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#why-crossmint-react-native">Why Crossmint React Native?</a></li>
        <li><a href="#core-features">Core Features</a></li>
      </ul>
    </li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#quick-start">Quick Start</a></li>
      </ul>
    </li>
    <li><a href="#authentication">Authentication</a>
      <ul>
        <li><a href="#oauth-login-methods">OAuth Login Methods</a></li>
      </ul>
    </li>
    <li><a href="#wallets">Wallets</a>
      <ul>
        <li><a href="#multi-chain-support">Multi-Chain Support</a></li>
        <li><a href="#using-wallets">Using Wallets</a></li>
      </ul>
    </li>
    <li><a href="#custom-storage-provider">Custom Storage Provider</a></li>
    <li><a href="#environment-setup">Environment Setup</a></li>
    <li><a href="#examples--documentation">Examples & Documentation</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

The Crossmint React Native SDK provides secure, native mobile wallet functionality for React Native applications. Build complete Web3 mobile experiences with authentication, wallets, and secure storage using platform-native encryption.

Supports Solana, 20+ EVM chains (Polygon, Base, etc.), with secure mobile authentication and encrypted storage.

### Why Crossmint React Native?

- 🚀 **Quick Integration**: Get started in minutes with React Native components
- 📱 **Mobile-First**: Built specifically for React Native with secure native storage
- 🔒 **Secure**: Uses Expo SecureStore for encrypted authentication token storage
- 💻 **Developer-First**: Complete TypeScript support with React Native patterns
- 🌐 **Familiar Web2 APIs**: Powered by our wallets SDK with intuitive, web-friendly interfaces
- 🆓 **Free to Start**: Start developing at no cost

### Core Features

- 🔐 **OAuth Authentication**: Google, Twitter/X authentication with secure storage
- 👛 **Embedded Wallets**: Multi-chain wallet creation and management
- 🔒 **Secure Storage**: Platform-native encrypted storage with Expo SecureStore
- 🔗 **Multi-Chain**: Unified API across Solana and 20+ EVM chains
- 📱 **Deep Linking**: Complete OAuth flow with deep linking support

## Getting Started

### Prerequisites

Make sure you have:
- React Native development environment set up
- Expo CLI installed
- A Crossmint developer account ([Sign up](https://www.crossmint.com/))
- API key from the [Crossmint Console](https://www.crossmint.com/console)

### Installation

```bash
pnpm add @crossmint/client-sdk-react-native-ui expo-secure-store expo-web-browser expo-device
```

### Quick Start

#### 1. Setup Providers

**Option A: With Crossmint Authentication (Recommended)**

```tsx
import {
  CrossmintProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider
} from "@crossmint/client-sdk-react-native-ui";

export default function App() {
  return (
    <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY}>
      <CrossmintAuthProvider>
        <CrossmintWalletProvider
          createOnLogin={{
            chain: "solana",
            signer: { type: "email" }
          }}
        >
          <MainApp />
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
```

**Option B: 🔧 Bring Your Own Authentication**

Already have authentication? Skip Crossmint Auth and use wallets with your existing system:

📖 **[Complete Custom Auth Guide](https://docs.crossmint.com/wallets/advanced/bring-your-own-auth#react-native)** - Full setup with server-side examples and implementation details.

```tsx
import {
  CrossmintProvider,
  CrossmintWalletProvider
} from "@crossmint/client-sdk-react-native-ui";

export default function App() {
  return (
    <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY}>
      {/* No CrossmintAuthProvider needed! */}
      <CrossmintWalletProvider>
        <MainApp />
      </CrossmintWalletProvider>
    </CrossmintProvider>
  );
}
```

#### 2. Use Authentication & Wallets

The React Native SDK uses [Expo's SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) for secure, encrypted storage of authentication tokens. This provides a platform-native secure storage solution that encrypts sensitive data on the device.

```tsx
import { View, Button, Text } from "react-native";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-native-ui";

export default function MainApp() {
  const { loginWithOAuth, logout, user } = useCrossmintAuth();
  const { wallet, status } = useWallet();

  if (!user) {
    return (
      <View style={{ padding: 20 }}>
        <Button
          title="Login with Google"
          onPress={() => loginWithOAuth("google")}
        />
      </View>
    );
  }

  if (status === "loaded") {
    return (
      <View style={{ padding: 20 }}>
        <Text>Welcome {user.email}!</Text>
        <Text>Wallet: {wallet?.address}</Text>
        <Button
          title="Send 1 USDC"
          onPress={() => wallet?.send(recipient, "usdc", "1.0")}
        />
        <Button title="Logout" onPress={logout} />
      </View>
    );
  }

  return <Text>Loading wallet...</Text>;
}
```

## Authentication

### OAuth Login Methods
```tsx
const { loginWithOAuth } = useCrossmintAuth();

// Available OAuth providers
<Button title="Google" onPress={() => loginWithOAuth("google")} />
<Button title="Twitter" onPress={() => loginWithOAuth("twitter")} />
```

## Wallets

### Multi-Chain Support
- **Solana**: Native SOL, SPL tokens
- **EVM Chains**: Ethereum, Polygon, Base, Arbitrum, and 15+ more
- **Unified API**: Same code works across all chains

### Using Wallets
```tsx
const { wallet, getOrCreateWallet } = useWallet();

// Get wallet info
const address = wallet?.address;
const balance = await wallet?.balances();

// Send tokens
const tx = await wallet?.send(recipient, "usdc", "10.5");
console.log("Transaction:", tx.explorerLink);

// For advanced use cases
const customWallet = await getOrCreateWallet({
  chain: "<your-chain>",
  signer: { type: "<your-signer-type>" }
});
```

## Custom Storage Provider

If you need to implement a custom storage solution, you can implement the `StorageProvider` interface and pass it to the `CrossmintAuthProvider`:

```tsx
import { CrossmintAuthProvider, type StorageProvider } from "@crossmint/client-sdk-react-native-ui";

// Implement your custom storage provider
class CustomStorage implements StorageProvider {
  async get(key: string): Promise<string | undefined> {
    // Your implementation
  }

  async set(key: string, value: string, expiresAt?: string): Promise<void> {
    // Your implementation
  }

  async remove(key: string): Promise<void> {
    // Your implementation
  }
}

// Use your custom storage provider
function App() {
  const customStorage = new CustomStorage();

  return (
    <CrossmintProvider apiKey="YOUR_API_KEY">
      <CrossmintAuthProvider customStorageProvider={customStorage}>
        {/* Your app content */}
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
```

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

## Examples & Documentation

- **[Wallets Expo Quickstart](https://github.com/Crossmint/wallets-expo-quickstart)** - Create and interact with Crossmint wallets using Crossmint Auth for React Native
- **[React Native SDK Documentation](https://docs.crossmint.com/sdk-reference/introduction)** - Complete API reference
- **[Custom Auth Guide](https://docs.crossmint.com/wallets/advanced/bring-your-own-auth#react-native)** - Server-side integration examples
- **[Expo SecureStore Guide](https://docs.expo.dev/versions/latest/sdk/securestore/)** - Learn more about secure storage

## Contact

To get in touch with the Crossmint team, please visit our [contact page](https://www.crossmint.com/contact) or reach out on [X](https://x.com/crossmint).

For questions about this SDK, visit our [documentation](https://docs.crossmint.com/introduction/about-crossmint) or contact our support team.

<p align="right">(<a href="#readme-top">back to top</a>)</p>