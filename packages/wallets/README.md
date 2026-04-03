# @crossmint/wallets-sdk

Typescript SDK for creating and managing [Crossmint Wallets](https://docs.crossmint.com) on EVM, Solana, and Stellar chains.

## Prerequisites

Get a Crossmint API key from the [developer console](https://docs.crossmint.com/introduction/platform/api-keys). Ensure your key has the **Wallet API** scopes enabled.

- **Client-side** (browser): Use a client API key
- **Server-side** (Node.js): Use a server API key

## Installation

```bash
npm install @crossmint/wallets-sdk
# or
pnpm add @crossmint/wallets-sdk
# or
yarn add @crossmint/wallets-sdk
```

## Quick Start

### Server-side (Node.js)

```ts
import { createCrossmint, CrossmintWallets } from "@crossmint/wallets-sdk";

const crossmint = createCrossmint({ apiKey: "<YOUR_SERVER_API_KEY>" });
const wallets = CrossmintWallets.from(crossmint);

// Create a wallet with a server signer
const wallet = await wallets.createWallet({
  chain: "base-sepolia",
  recovery: { type: "server", secret: "<RECOVERY_SECRET>" },
});

console.log(wallet.address);

// Send tokens
const tx = await wallet.send("0xRecipientAddress", "usdc", "10");
console.log(tx.explorerLink);
```

### Client-side (Headless)

For client-side usage without React, you can use the SDK directly with JWT authentication:

```ts
import { createCrossmint, CrossmintWallets } from "@crossmint/wallets-sdk";

const crossmint = createCrossmint({ apiKey: "<YOUR_CLIENT_API_KEY>" });
crossmint.setJwt("<USER_JWT>");

const wallets = CrossmintWallets.from(crossmint);

const wallet = await wallets.getWallet({ chain: "base-sepolia" });
console.log(wallet.address);
```

> For React apps, use [`@crossmint/client-sdk-react-ui`](https://www.npmjs.com/package/@crossmint/client-sdk-react-ui) which provides `CrossmintWalletProvider`, hooks, and built-in UI for OTP and passkey flows.

## Core Concepts

### Signers

Wallets SDK uses a two-tier signer model:

- **Recovery signer** — High-security, used for wallet recovery and adding new signers. Supports email OTP, phone OTP, external wallet, or server key.
- **Operational signer** — Low-friction, used for day-to-day signing. Supports server key, external wallet, passkey, and device (browser/mobile only). For server-side (Node.js) usage, use a **server** or **external-wallet** signer.

When no operational signer is available, the recovery signer automatically serves as a fallback for signing.

### Wallet Lifecycle

```ts
// Create a new wallet with a server signer
const wallet = await wallets.createWallet({
  chain: "base-sepolia",
  recovery: { type: "server", secret: "<RECOVERY_SECRET>" },
});
```

```ts
// Create a new wallet with an external wallet signer
const wallet = await wallets.createWallet({
  chain: "base-sepolia",
  recovery: {
    type: "external-wallet",
    address: "0xYourWalletAddress",
    onSign: async (message: string) => {
      // Sign the message with your wallet/KMS and return the signature
      return await yourWallet.signMessage({ message: { raw: message as `0x${string}` } });
    },
  },
});
```

```ts
// Retrieve an existing wallet (client-side)
const wallet = await wallets.getWallet({ chain: "base-sepolia" });
```

```ts
// Retrieve an existing wallet (server-side)
const wallet = await wallets.getWallet("0xWalletAddress", {
  chain: "base-sepolia",
});
```

## Usage

### Balances

```ts
const balances = await wallet.balances();

console.log(balances.nativeToken.amount);
console.log(balances.usdc.amount);
```

### Send Tokens

```ts
const tx = await wallet.send("0xRecipient", "usdc", "100");
console.log(tx.explorerLink);
```

### Transfers

```ts
const transfers = await wallet.transfers({
  tokens: "usdc",
  status: "successful",
});
```

### NFTs

```ts
const nfts = await wallet.nfts({ perPage: 10, page: 1 });
```

### Chain-Specific Transactions

```ts
import { EVMWallet, SolanaWallet, StellarWallet } from "@crossmint/wallets-sdk";

// EVM — smart contract interaction
const evmWallet = EVMWallet.from(wallet);
const tx = await evmWallet.sendTransaction({
  to: "0xContractAddress",
  abi: contractAbi,
  functionName: "mint",
  args: [1],
  value: 0n,
});

// EVM — sign a message
const sig = await evmWallet.signMessage({ message: "Hello" });

// EVM — viem public client
const client = evmWallet.getViemClient();

// Solana
const solWallet = SolanaWallet.from(wallet);
const solTx = await solWallet.sendTransaction({
  serializedTransaction: "<base64-encoded-transaction>",
});

// Stellar
const stellarWallet = StellarWallet.from(wallet);
const stellarTx = await stellarWallet.sendTransaction({
  contractId: "C...",
  method: "transfer",
  args: { to: "G...", amount: "1000000" },
});
```

### Signer Management

```ts
// Add a new signer
await wallet.addSigner({ type: "server", secret: "<SECRET>" });

// List signers
const signers = await wallet.signers();
console.log(signers); // [{ type: "server", locator: "server:...", status: "success" }, ...]

// Set the active signer (required after getWallet server-side)
await wallet.useSigner({ type: "server", secret: "<SECRET>" });
```

### Transaction Approval (Prepare-Only Mode)

For flows that require multi-step approval:

```ts
// Create a transaction without auto-approving
const pendingTx = await wallet.send("0xRecipient", "usdc", "10", {
  prepareOnly: true,
});
console.log(pendingTx.transactionId);

// Approve later
const result = await wallet.approve({
  transactionId: pendingTx.transactionId,
});
```

## Signer Types

| Type | Use Case | Platforms |
|---|---|---|
| `device` | Hardware-backed, no OTP. **Browser and React Native only** — not available in Node.js. | Browser, React Native |
| `server` | Server-side automated operations (AI agents, backends). | Node.js |
| `email` | OTP-based recovery signer. | All |
| `phone` | OTP-based recovery signer. | All |
| `passkey` | WebAuthn/FIDO2 biometric signer. | Browser (EVM only) |
| `external-wallet` | Bring-your-own key (MetaMask, KMS, etc). | All |

## React / React Native

For React applications, use [`@crossmint/client-sdk-react-ui`](https://www.npmjs.com/package/@crossmint/client-sdk-react-ui) which provides wallet providers, hooks (`useWallet`, `useWalletOtpSigner`), and built-in UI for OTP and passkey flows.

For React Native, see [`@crossmint/client-sdk-react-native-ui`](https://www.npmjs.com/package/@crossmint/client-sdk-react-native-ui).

## Documentation

- [Crossmint Wallets Docs](https://docs.crossmint.com)
- [SDK Reference](https://docs.crossmint.com/sdk-reference/wallets)

## License

Apache-2.0
