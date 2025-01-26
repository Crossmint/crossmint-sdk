<div align="center">
  <h1 align="center">Crossmint SDK</h1>

  <p align="center">
    A comprehensive suite of tools for blockchain integration, authentication, and NFT functionality
    <br />
    <a href="https://docs.crossmint.com/sdk-reference/introduction"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://www.smarterwallet.dev/">View Demo</a>
    ·
    <a href="https://github.com/Crossmint/crossmint-sdk/issues">Report Bug</a>
    ·
    <a href="https://github.com/Crossmint/crossmint-sdk/issues">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#package-overview">Package Overview</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#development">Development</a></li>
    <li><a href="#running-the-demo">Running the Demo</a></li>
    <li><a href="#making-package-changes">Making Package Changes</a></li>
    <li><a href="#publishing">Publishing</a></li>
    <li><a href="#migration-guides">Migration Guides</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

![Crossmint SDK](https://github.com/user-attachments/assets/28d4ac5c-9373-45a3-969d-4dbf1d8200a8)

The Crossmint SDK is a powerful collection of packages designed to simplify blockchain integration for developers. Our goal is to make Web3 development accessible without requiring extensive blockchain experience or cryptocurrency knowledge.

### Why Crossmint?

- 🚀 **Quick Integration**: Set up in just 5 minutes
- 💻 **Developer-First**: Build end-to-end blockchain solutions without deep Web3 expertise
- 🔒 **Secure**: Enterprise-grade security for all blockchain interactions
- 💳 **Fiat-First**: Enable users to participate in Web3 without cryptocurrency
- 🆓 **Free for Sellers**: No costs to integrate

### Core Features

- 💳 Wallet-less credit card purchases for NFTs
- 🔐 Authentication and session management
- 👛 Smart wallet integration
- 📜 Verifiable credentials management
- 🌐 Cross-platform compatibility

## Package Overview

### Client-Side Packages

- `@crossmint/client-sdk-react-ui`: React components and hooks for integrating blockchain, authentication, and NFT-related functionalities into your application.

- `@crossmint/client-sdk-base`: Core client-side functionality and essential building blocks for Crossmint integration.

- `@crossmint/client-sdk-auth`: Client-side authentication tools for managing user sessions and integrating various authentication methods.

- `@crossmint/client-sdk-verifiable-credentials`: Comprehensive tools for managing verifiable credentials, including verification, presentation, and decryption capabilities.

- `@crossmint/client-sdk-smart-wallet`: Smart wallet functionality featuring passkey support, auth providers (Privy, Dynamic), and blockchain providers (Viem account, EIP1193 compatible).

### Server-Side Packages

- `@crossmint/server-sdk`: Server-side authentication and session management tools, specifically designed for SSR applications like Next.js.

### Common Packages

- `@crossmint/common-sdk-base`: Shared utilities, enums, and common functionality across the SDK ecosystem.

- `@crossmint/common-sdk-auth`: Shared authentication utilities and tools used across different SDK packages.

### Demo Applications

- `@crossmint/client-sdk-react-ui`: A NextJS application showcasing the full capabilities of the SDK, including authentication and smart wallet integration.

## Getting Started

### Prerequisites

```shell
node >= 20
pnpm
```

### Installation

1. Clone the repository:
```shell
git clone https://github.com/Crossmint/crossmint-sdk.git
```

2. Install dependencies:
```shell
cd crossmint-sdk
pnpm install
```

3. Build all packages:
```shell
pnpm build
```

## Development

### Environment Setup

1. Create a `.env` file in the demo app directory:
```shell
cd apps/wallets/smart-wallet/next
```

2. Add the following environment variable:
```shell
NEXT_PUBLIC_CROSSMINT_AUTH_SMART_WALLET_API_KEY=your_api_key_here
```

You can obtain a staging client-side API key from the [Crossmint Console](https://staging.crossmint.com/console/projects/apiKeys). For detailed instructions on getting an API key, see our [documentation](https://docs.crossmint.com/wallets/quickstarts/EVM/non-custodial-wallets/evm-non-custodial-client-side#2-get-an-api-key).

### Running the Demo

1. Build and start the demo application:
```shell
cd apps/wallets/smart-wallet/next
pnpm build
pnpm start
```

### Making Package Changes

When modifying packages locally:

1. Make your changes in the relevant package
2. Rebuild the modified package:
```shell
# Inside the package directory
pnpm build
```

3. Reinstall dependencies in your project:
```shell
# From the root directory
pnpm install
```

4. Restart the demo application to see your changes

## Publishing

1. Run `pnpm change:add` to select packages for update
2. Commit the generated changeset file
3. Merge your PR to `main`
4. A "Release packages" PR will be created automatically
5. Merge the release PR to publish to NPM

## Migration Guides

- [Migrating to 0.1.X](https://docs.google.com/document/d/14IKpjrij7kU7Dr0I7rZkf0PyDNbXiklx2v4GuzUrFbw/edit?usp=sharing)
- [Migrating to 0.2.X](https://docs.google.com/document/d/1mA0W-iAs0nHHW0ANX0TfZ5qrzxPGxNchPj13W6cHc-Y/edit?usp=sharing)

## Documentation

For detailed documentation and guides, visit our [official documentation](https://docs.crossmint.com/).

## Contact

To get in touch with the Crossmint team, please visit our [contact page](https://www.crossmint.com/contact).
or on [X](https://x.com/crossmint)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
