# Crossmint React SDK


> **Create chain-agnostic wallets for your users in minutes**  
> Supports Solana, 20+ EVM chains (Polygon, Base, etc.), with custodial and non-custodial options.

## 🚀 Quick Start

```bash
pnpm add @crossmint/client-sdk-react-ui
```


### 1. Setup Providers

**Option A: With Crossmint Authentication (Recommended)**

```tsx
"use client";

import {
  CrossmintProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider
} from "@crossmint/client-sdk-react-ui";

export default function App({ children }) {
  return (
    <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY}>
      <CrossmintAuthProvider authModalTitle="Sign in to MyApp">
        <CrossmintWalletProvider
          createOnLogin={{ 
            chain: "polygon-amoy", 
            signer: { type: "email" } 
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
```

**Option B: 🔧 Bring Your Own Authentication**

Already have authentication? Skip Crossmint Auth and use wallets with your existing system:

📖 **[Complete Custom Auth Guide](https://docs.crossmint.com/wallets/advanced/bring-your-own-auth)** - Full setup with examples and implementation details.

```tsx
"use client";

import {
  CrossmintProvider,
  CrossmintWalletProvider
} from "@crossmint/client-sdk-react-ui";

export default function App({ children }) {
  return (
    <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY}>
      {/* No CrossmintAuthProvider needed! */}
      <CrossmintWalletProvider 
        createOnLogin={{ 
            chain: "solana", 
            signer: { 
                type: "email", 
                email: "<email-from-your-auth-system>" 
            } 
        }}>
        {children}
      </CrossmintWalletProvider>
    </CrossmintProvider>
  );
}
```

### 2. Use Authentication & Wallets

```tsx
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";

export default function MyComponent() {
  const { login, logout, user, status } = useAuth();
  const { wallet, status: walletStatus } = useWallet();

  if (status === "logged-out") {
    return <button onClick={login}>Sign In</button>;
  }

  if (walletStatus === "loaded") {
    return (
      <div>
        <p>Welcome {user?.email}!</p>
        <p>Wallet: {wallet?.address}</p>
        <button onClick={() => wallet?.send(recipient, "usdc", "1.0")}>
          Send 1 USDC
        </button>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <div>Loading wallet...</div>;
}
```

## 🔐 Authentication

### Supported Login Methods
- **Email OTP**: Passwordless sign-in with verification code
- **Social Accounts**: Google, Twitter/X, Farcaster
- **Web3 Wallets**: Connect external wallets for authentication
- **Custom UI**: Headed or headless authentication flows

### Provider Configuration
```tsx
<CrossmintAuthProvider
  loginMethods={["email", "google", "twitter", "farcaster", "web3"]}
  authModalTitle="Welcome to MyApp"
  // Optional: Customize the appearance of the auth modal. 
  // -> See https://docs.crossmint.com/authentication/customization for more details.
  appearance={{
    borderRadius: "12px",
    colors: {
      background: "#ffffff",
      textPrimary: "#000000",
      accent: "#6366f1"
    }
  }}
>
```

## 💳 Wallets

### Multi-Chain Support
- **Solana**: Native SOL, SPL tokens
- **EVM Chains**: Ethereum, Polygon, Base, Arbitrum, and 15+ more
- **Unified API**: Same code works across all chains

### Wallet Creation Options
```tsx
<CrossmintWalletProvider
  createOnLogin={{
    chain: "solana", // or EVM chains: "polygon", "base", etc.
    signer: { 
      type: "email" // or "api-key", "passkey", "external-wallet"
    }
  }}
>
```

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

## 🎨 UI Components

Ready-to-use components for displaying wallet content:

```tsx
import { 
  CrossmintNFTCollectionView,
  CrossmintNFTDetail 
} from "@crossmint/client-sdk-react-ui";

// Display user's NFT collection
<CrossmintNFTCollectionView {...props} />

// Show NFT details
<CrossmintNFTDetail {...props} />
```

## 📱 React Native

For React Native apps, use our dedicated [npm package](https://www.npmjs.com/package/@crossmint/client-sdk-react-native-ui).


```bash
pnpm add @crossmint/client-sdk-react-native-ui
```

## 🛠️ Environment Setup

1. Get your API key from [Crossmint Console](https://staging.crossmint.com/console/projects/apiKeys)

2. Add to your `.env`:
```bash
NEXT_PUBLIC_CROSSMINT_API_KEY=your_api_key_here
```

## 📚 Examples & Documentation

- **[Quickstarts](https://www.crossmint.com/quickstarts)** - Find your quickstart for your use case.

---

**Questions?** Visit our [documentation](https://docs.crossmint.com/introduction/about-crossmint) or contact our support team. 