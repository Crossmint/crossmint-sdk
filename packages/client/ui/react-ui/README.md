# `@crossmint/client-sdk-react-ui`

## You can check the full documentation at [docs.crossmint.com](https://docs.crossmint.com/)

---

If you're using React.js, or Next.js, Crossmint provides a client integration specific for you.

## Quick Setup

First, add the Crossmint Client SDK to your project with the following command:

```shell
pnpm add @crossmint/client-sdk-react-ui
```

### Add payment button to your site

Check our dedicated section for payments [in the docs](https://docs.crossmint.com/docs/integration-guide).

---

### Crossmint Authentication

Check out our quickstart [in the docs](https://docs.crossmint.com/authentication/quickstart).

#### Key Components
We provide two essential React context providers:

- `CrossmintProvider` - Base provider for accessing Crossmint services
- `CrossmintAuthProvider` - Authentication context provider for your components

#### Supported Login Methods
- **Email OTP**: Passwordless sign-in using a one-time code
- **Social Accounts**: Sign in with Google, Apple, X, and more
- **Farcaster**: Using the Sign In With Farcaster (SIWF) standard

#### UI Options
- **Modal Login**: Popup interface for authentication
- **Embedded Login**: In-page authentication component
- **Customization**: Flexible UI styling and email template options

[Screenshot placeholder for Auth UI]

Visit our [customization guide](https://docs.crossmint.com/authentication/customization) to learn more about styling options and email templates.

---

### EVM Non-Custodial Wallets

Check out our quickstart [in the docs](https://docs.crossmint.com/wallets/quickstarts/EVM/non-custodial-wallets/evm-non-custodial-client-side).

We provide two essential React hooks for integrating Crossmint wallets into your application:

#### `useAuth`
```typescript
import { useAuth } from "@crossmint/client-sdk-react-ui";
```
Manages authentication state and user sessions. Key features:
- `login()` - Initiate user authentication
- `logout()` - End user session
- `jwt` - Current user's JWT token
- `user` - Active user information
- `status` - Current auth state ("loading" | "authenticated" | "unauthenticated")

#### `useWallet`
```typescript
import { useWallet } from "@crossmint/client-sdk-react-ui";
```
Handles wallet creation and management. Key features:
- `wallet` - Access to the EVMSmartWallet instance
- `status` - Wallet state ("not-loaded" | "in-progress" | "loaded" | "loading-error")
- `getOrCreateWallet()` - Initialize or retrieve user's wallet
- `clearWallet()` - Reset wallet state

Visit [our documentation](https://docs.crossmint.com/wallets/quickstarts/overview) for complete implementation details and advanced features.

---

### Wallet UI Components

We offer two components to help you quickly get up and running with your project using Crossmint wallets:

-   `CrossmintNFTCollectionView` - Display a grid of NFTs.
    ![Wallet Collection Component](https://user-images.githubusercontent.com/20989060/223705873-79197f38-4fb6-4773-98b9-82ef80f24aef.png)

-   `CrossmintNFTDetail` - Display a card showing all NFT related details.
    ![NFT Detail Component](https://user-images.githubusercontent.com/20989060/223704647-8b99ae40-6ebf-4cd6-bc20-c41c5fd13db0.png)

Visit [our documentation](https://docs.crossmint.com/wallets/advanced/wallet-ui-components) for integration instructions.

## Migration guide to 0.1.X versions

Version 0.1.0 introduces breaking changes. To learn how to migrate from a version lower than 0.1.0, [check out the migration guide](https://docs.google.com/document/d/14IKpjrij7kU7Dr0I7rZkf0PyDNbXiklx2v4GuzUrFbw/edit?usp=sharing).

## [Changelog](https://docs.google.com/document/d/e/2PACX-1vR5NzVS2msrCMZxlcfBgAT-Y8kAypeKqH_WBeNiwVTmyEzLZvJBWrKrz_966-d3jumwIBi94IXGT6Wp/pub)

## Migration guide to 0.2.X versions

Version 0.2.0 introduces breaking changes. To learn how to migrate from a version lower than 0.2.0, [check out the migration guide](https://docs.google.com/document/d/1mA0W-iAs0nHHW0ANX0TfZ5qrzxPGxNchPj13W6cHc-Y/edit?usp=sharing).

## Upgrading to version 3 (Embedded Checkout)

Upgrade guide [here](https://docs.crossmint.com/nft-checkout/embedded/upgrade/v3#which-version-am-i-using).
