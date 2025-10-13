<div align="center">
  <h1 align="center">Crossmint SDK</h1>

  <p align="center">
    A comprehensive suite of tools for blockchain integration, authentication, and NFT functionality
    <br />
    <a href="https://docs.crossmint.com/sdk-reference/introduction"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://playground.crossmint.com/">View Demo</a>
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
        <li><a href="#why-crossmint">Why Crossmint?</a></li>
        <li><a href="#core-features">Core Features</a></li>
      </ul>
    </li>
    <li><a href="#package-overview">Package Overview</a>
      <ul>
        <li><a href="#client-side-packages">Client-Side Packages</a></li>
        <li><a href="#server-side-packages">Server-Side Packages</a></li>
        <li><a href="#demo-applications">Demo Applications</a></li>
      </ul>
    </li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li>
      <a href="#building-sdk-locally">Building SDK Locally</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#making-package-changes">Making Package Changes</a></li>
      </ul>
    </li>
    <li><a href="#publishing">Publishing</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

![Crossmint SDK](https://github.com/user-attachments/assets/28d4ac5c-9373-45a3-969d-4dbf1d8200a8)

The Crossmint SDK is a powerful collection of packages designed to simplify blockchain integration for developers. Our goal is to make Web3 development accessible without requiring extensive blockchain experience or cryptocurrency knowledge.

### Why Crossmint?

- 🚀 **Quick Integration**: All our tools have 5-min quickstarts
- 💻 **Developer-First**: Build end-to-end blockchain solutions without deep Web3 expertise
- 🔒 **Secure**: Enterprise-grade security for all blockchain interactions
- 💳 **Fiat-First**: Enable users to participate in Web3 without cryptocurrency
- 🆓 **Free to Start**: Start developing at no cost

### Core Features

- 💳 NFT checkout: with credit card and cross-chain
- 🔐 Authentication and session management
- 👛 Embedded wallets
- 📜 Verifiable credentials

## Package Overview

### Wallet SDK

- `@crossmint/wallets-sdk`: Universal Wallet SDK.

### Client-Side Packages

- `@crossmint/client-sdk-react-ui`: React SDK, with UI components.

- `@crossmint/client-sdk-react-native-ui`: React Native SDK.
	
- `@crossmint/client-sdk-auth`: Headless typescript SDK for managing auth and user profiles.
	
- `@crossmint/client-sdk-verifiable-credentials`: Headless typescript SDK for Verifiable Credentials.

- `@crossmint/client-sdk-smart-wallet` [DEPRECATED]: Headless typescript SDK for smart wallets.

- `@crossmint/wallets-sdk`: Headless typescript SDK for EVM + Solana MPC / Smart Wallets.
	
Other:
	
- `@crossmint/client-sdk-base`: Core client-side functionality and essential building blocks for Crossmint integration. Typically you don't need to integrate against this directly.

### Server-Side Packages

- `@crossmint/server-sdk`: Server-side SDK.

### Demo Applications

- [🔒 Wallets Quickstart)](https://github.com/Crossmint/wallets-quickstart): Create and interact with Crossmint wallets. This quickstart uses Crossmint Auth and uses your email as a signer for that wallet. [Demo](https://wallets.demos-crossmint.com/)
- [💳 Hosted Checkout Quickstart)](https://github.com/Crossmint/hosted-checkout-quickstart): Allow your customers to buy NFTs with credit card and crypto payments, using Crossmint's hosted checkout. This quickstart provides a seamless integration for accepting payments in your dApp. [Demo](https://hosted-checkout.demos-crossmint.com/)
- [🏦 Fintech Quickstart)](https://github.com/Crossmint/fintech-starter-app): Create your own Fintech app in minutes using Crossmint wallets and onramp. [Demo](https://fintech-starter-app.demos-crossmint.com/)

## Getting Started

To get started with the SDK, install the packages you need into your project.

ie. 
`pnpm add @crossmint/wallets-sdk`

Then, import the package you need.

ie.
`import { CrossmintWallet } from "@crossmint/wallets-sdk";`

For more information on how to use the SDK, see the [Crossmint SDK Documentation](https://docs.crossmint.com/sdk-reference/introduction).

## Building SDK locally

### Prerequisites

```shell
node >= 20.19.4
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

## Documentation

For detailed documentation and guides, visit our [official documentation](https://docs.crossmint.com/).

## Contact

To get in touch with the Crossmint team, please visit our [contact page](https://www.crossmint.com/contact).
or on [X](https://x.com/crossmint)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
