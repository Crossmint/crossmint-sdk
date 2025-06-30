# Wallets SDK

A Typescript SDK to interact with Crossmint Wallets. This SDK enables developers to create and manage smart contract wallets that support both traditional keypair-based signing and passkey authentication across Solana and EVM chains.

-   **Multi-chain**: supports Solana and EVM chains
-   **Multiple signer types**: passkeys, ECDSA keypairs, delegated signers
-   **Smart** and **MPC** wallets
-   **User** (client-side) wallets and **agent** (server-side) wallets
-   **Familiar API**: follows `viem` and `web3.js` conventions


Get a Crossmint client API key from [here](https://docs.crossmint.com/introduction/platform/api-keys/client-side) and add it to your `.env` file. Make sure your API key has all scopes for `Wallet API`, and `Users`.  

## Installation

```bash
pnpm install @crossmint/wallets-sdk
```

## Usage

```ts
import { CrossmintWallets, createCrossmint } from "@crossmint/wallets-sdk";

const crossmint = createCrossmint({
    apiKey: "<your-client-OR-server-api-key>",
    jwt: "<your-client-jwt>", // only required for client-side calls
});
const crossmintWallets = CrossmintWallets.from(crossmint);
const wallet = await crossmintWallets.getOrCreateWallet({
    chain: "<your-chain>",  
    signer: {
        type: "email",
        email: "<your-email>",
    },
});

console.log(wallet.address);
```

### Get wallet balances

```ts
const balances = await wallet.balances();

console.log(balances.nativeToken.amount);
console.log(balances.usdc.amount);
```

### Transfer

```ts
const transaction = await wallet.send(recipient, "usdc", "100");

console.log(transaction.explorerLink);
```

### Get wallet activity

```ts
const activity = await wallet.experimental_activity();

console.log(activity.events);
```

### Delegated signers

```ts
// Add a delegated signer
await wallet.addDelegatedSigner({ signer: "<signer-address>" });

const signers = await wallet.delegatedSigners();

console.log(signers);
```

### Create custom transactions

```ts
import { SolanaWallet, EVMWallet } from "@crossmint/wallets-sdk";

// Solana
const solanaWallet = SolanaWallet.from(wallet);
const solTx = await solanaWallet.sendTransaction({ transaction: "<serialized-or-non-serialized-transaction>" });

console.log(solTx.explorerLink);

// EVM
const evmWallet = EVMWallet.from(wallet);
const evmTx = await evmWallet.sendTransaction({ transaction: "<serialized-or-non-serialized-transaction>" });

console.log(evmTx.explorerLink);
```
