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
- `CrossmintWalletProvider` - Wallet context provider for your components, can be used to integrate with other auth providers. Visit [Crossmint Signers Demo](https://crossmint-signers-demo.vercel.app/examples/dynamic) for complete implementation details and advanced features.

#### Supported Login Methods
- **Email OTP**: Passwordless sign-in using a one-time code
- **Social Accounts**: Sign in with Google, X, and more
- **Farcaster**: Using the Sign In With Farcaster (SIWF) standard
- **Web3**: Sign in with EOA wallet (limited support for now) but will be available soon

#### UI Options
- **Modal Login**: Popup interface for authentication
- **Embedded Login**: In-page authentication component
- **Customization**: Flexible UI styling and email template options

<img width="749" alt="Screenshot 2025-01-26 at 11 57 31 AM" src="https://github.com/user-attachments/assets/bd18ce58-ea57-43a0-bda7-9237d77f3b40" />

Visit our [customization guide](https://docs.crossmint.com/authentication/customization) to learn more about styling options and email templates.

---

### User Wallets

Check out our quickstart [in the docs](https://docs.crossmint.com/wallets/quickstarts/EVM/non-custodial-wallets/evm-non-custodial-client-side).

We provide two essential React hooks for integrating Crossmint wallets into your application:

#### `useAuth`
```typescript
import { useAuth } from "@crossmint/client-sdk-react-ui";
```
Manages authentication state and user sessions. Key features:
- `status` - Current auth state ("logged-in" | "logged-out" | "in-progress" | "initializing")
- `user` - Active user information
- `jwt` - Current user's JWT token
- `getUser()` - Retrieve current user information
- `login()` - Initiate user authentication
- `logout()` - End user session
- `crossmintAuth` - Access to the CrossmintAuth instance

#### `useWallet`
```typescript
import { useWallet } from "@crossmint/client-sdk-react-ui";
```
Handles wallet creation and management. Key features:
- `status` - Wallet state ("not-loaded" | "in-progress" | "loading-error" | "loaded")
- `wallet` - Access to the EVMSmartWallet instance
- `type` - Wallet type ("evm-smart-wallet" | "solana-smart-wallet")
- `getOrCreateWallet()` - Initialize or retrieve user's wallet
- `clearWallet()` - Reset wallet state
- `createPasskeySigner()` - Create a passkey signer for the wallet (not supported for Solana)

Visit [our documentation](https://docs.crossmint.com/wallets/quickstarts/overview) for complete implementation details and advanced features.

---

### Wallet UI Components

We offer two components to help you quickly get up and running with your project using Crossmint wallets:

-   `CrossmintNFTCollectionView` - Display a grid of NFTs.
    ![Wallet Collection Component](https://user-images.githubusercontent.com/20989060/223705873-79197f38-4fb6-4773-98b9-82ef80f24aef.png)

-   `CrossmintNFTDetail` - Display a card showing all NFT related details.
    ![NFT Detail Component](https://user-images.githubusercontent.com/20989060/223704647-8b99ae40-6ebf-4cd6-bc20-c41c5fd13db0.png)

Visit [our documentation](https://docs.crossmint.com/wallets/advanced/wallet-ui-components) for integration instructions.

## Examples

- [Smart Wallets Demo (Next.js Starter Kit)](../../../../apps/wallets/smart-wallet/next/README.md)

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
pnpm i
pnpm build
pnpm start
```

For more information on how to run the demo application, see the [Smart Wallets Demo (Next.js Starter Kit) README](../../../../apps/wallets/smart-wallet/next/README.md).


