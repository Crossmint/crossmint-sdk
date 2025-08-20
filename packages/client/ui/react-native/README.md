# Crossmint React Native SDK

> **Create chain-agnostic wallets for your React Native apps in minutes**
> Supports Solana, 20+ EVM chains (Polygon, Base, etc.), with secure mobile authentication.

## 🚀 Quick Start

```bash
pnpm add @crossmint/client-sdk-react-native-ui expo-secure-store expo-web-browser expo-device
```

### 1. Setup Providers

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

### 2. Use Authentication & Wallets

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

## 🔐 Authentication

### OAuth Login Methods
```tsx
const { loginWithOAuth } = useCrossmintAuth();

// Available OAuth providers
<Button title="Google" onPress={() => loginWithOAuth("google")} />
<Button title="Twitter" onPress={() => loginWithOAuth("twitter")} />
```

## 💳 Wallets

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

## 🛠️ Environment Setup

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

### 🚀 Production Setup

When moving to production, ensure you:

1. Create a [production API key](https://docs.crossmint.com/introduction/platform/api-keys/client-side)
2. **Critical**: Add your mobile app identifiers to the production API key:
   - iOS: Bundle ID (e.g., `com.company.appname`)
   - Android: Package name (e.g., `com.company.appname`)

⚠️ **Important**: Production strictly enforces mobile app identifier whitelisting, unlike staging. Missing this step will cause silent request failures in production even if everything works in staging.

See [Mobile App Identifiers documentation](https://docs.crossmint.com/introduction/platform/api-keys/client-side#mobile-app-identifiers) for complete setup instructions.

## 📚 Examples & Documentation

- **[Wallets Expo Quickstart](https://github.com/Crossmint/wallets-expo-quickstart)** - Create and interact with Crossmint wallets using Crossmint Auth for React Native.

---

**Questions?** Visit our [documentation](https://docs.crossmint.com/introduction/about-crossmint) or contact our support team.
