<div align="center">
  <h1 align="center">Crossmint React UI SDK</h1>

  <p align="center">
    Create chain-agnostic wallets for your users in minutes with React components
    <br />
    <a href="https://docs.crossmint.com/wallets/quickstarts/react"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://wallets.demos-crossmint.com/">View Demo</a>
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
        <li><a href="#why-crossmint-react-ui">Why Crossmint React UI?</a></li>
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
        <li><a href="#supported-login-methods">Supported Login Methods</a></li>
        <li><a href="#provider-configuration">Provider Configuration</a></li>
      </ul>
    </li>
    <li><a href="#wallets">Wallets</a>
      <ul>
        <li><a href="#multi-chain-support">Multi-Chain Support</a></li>
        <li><a href="#wallet-creation-options">Wallet Creation Options</a></li>
        <li><a href="#using-wallets">Using Wallets</a></li>
      </ul>
    </li>
    <li><a href="#ui-components">UI Components</a></li>
    <li><a href="#react-native">React Native</a></li>
    <li><a href="#environment-setup">Environment Setup</a></li>
    <li><a href="#examples--documentation">Examples & Documentation</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

The Crossmint React UI SDK provides ready-to-use React components and hooks for seamless blockchain integration. Build complete Web3 experiences with authentication, wallets, and NFT functionality without the complexity of managing blockchain infrastructure.

Supports Solana, 20+ EVM chains (Polygon, Base, etc.), with custodial and non-custodial options.

### Why Crossmint React UI?

- 🚀 **Quick Integration**: Get started in minutes with pre-built React components
- 💻 **Developer-First**: Complete TypeScript support with intuitive React patterns
- 🔒 **Secure**: Enterprise-grade security for all blockchain interactions
- 🌐 **Familiar Web2 APIs**: Powered by our wallets SDK with intuitive, web-friendly interfaces
- 🎨 **Customizable**: Flexible UI components that match your brand
- 🆓 **Free to Start**: Start developing at no cost

### Core Features

- 🔐 **Authentication**: Email OTP, social logins, Web3 wallets
- 👛 **Embedded Wallets**: Multi-chain wallet creation and management
- 🎨 **UI Components**: Ready-to-use NFT collection and detail views
- 🔗 **Multi-Chain**: Unified API across Solana and 20+ EVM chains
- ⚛️ **React Native**: Dedicated package for mobile development

## Getting Started

### Prerequisites

Make sure you have:
- Node.js installed
- A Crossmint developer account ([Sign up](https://www.crossmint.com/))
- API key from the [Crossmint Console](https://www.crossmint.com/console)

### Installation

```bash
pnpm add @crossmint/client-sdk-react-ui
```

### Quick Start

#### 1. Setup Providers

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

#### 2. Use Authentication & Wallets

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

## Authentication

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

## Wallets

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

## UI Components

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

## React Native

For React Native apps, use our dedicated [npm package](https://www.npmjs.com/package/@crossmint/client-sdk-react-native-ui).

```bash
pnpm add @crossmint/client-sdk-react-native-ui
```

## Environment Setup

1. Get your API key from [Crossmint Console](https://staging.crossmint.com/console/projects/apiKeys)

2. Add to your `.env`:
```bash
NEXT_PUBLIC_CROSSMINT_API_KEY=your_api_key_here
```

## Examples & Documentation

- **[Quickstarts](https://www.crossmint.com/quickstarts)** - Find your quickstart for your use case
- **[React SDK Documentation](https://docs.crossmint.com/sdk-reference/introduction)** - Complete API reference
- **[Authentication Guide](https://docs.crossmint.com/authentication/overview)** - Authentication setup and customization
- **[Wallet Integration](https://docs.crossmint.com/wallets/overview)** - Wallet creation and management

## Contact

To get in touch with the Crossmint team, please visit our [contact page](https://www.crossmint.com/contact) or reach out on [X](https://x.com/crossmint).

For questions about this SDK, visit our [documentation](https://docs.crossmint.com/introduction/about-crossmint) or contact our support team.

<p align="right">(<a href="#readme-top">back to top</a>)</p>