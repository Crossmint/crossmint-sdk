# Wallets SDK

A Typescript SDK to interact with Crossmint Wallets. This SDK enables developers to create and manage smart contract wallets that support both traditional keypair-based signing and passkey authentication across Solana and EVM chains.

-   **Multi-chain**: supports Solana and EVM chains
-   **Multiple signer types**: passkeys, ECDSA keypairs, delegated signers
-   **Smart** and **MPC** wallets
-   **User** (client-side) wallets and **agent** (server-side) wallets
-   **Familiar API**: follows `viem` and `web3.js` conventions

## Installation

```sh
npm install @crossmint/wallets-sdk
# or
pnpm add @crossmint/wallets-sdk
```

## Quick Start

```ts
import { CrossmintWallets, createCrossmint } from "@crossmint/wallets-sdk";

const crossmint = createCrossmint({
    apiKey: "<YOUR_API_KEY>",
    jwt: "<USER_TOKEN>", // Not needed for server wallets
});
const crossmintWallets = CrossmintWallets.from(crossmint);
const wallet = await crossmintWallets.getOrCreateWallet({
    chain: "base-sepolia",
    signer: {
        type: "passkey",
    },
});

const address = wallet.address;
```

## Solana Examples

### Wallet Creation

#### Smart Wallets

```ts
import { Keypair } from "@solana/web3.js";

const keypair = Keypair.generate();
const wallet = await crossmintWallets.getOrCreateWallet({
    chain: "solana",
    signer: {
        type: "external-wallet",
        address: keypair.publicKey.toBase58(),
        onSignTransaction: async (transaction: VersionedTransaction) => {
            return await keypair.signTransaction(transaction);
        },
    },
});
```

### Sending Transactions

```ts
import {
    Connection,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const memoInstruction = new TransactionInstruction({
    keys: [
        {
            pubkey: new PublicKey(wallet.address),
            isSigner: true,
            isWritable: true,
        },
    ],
    data: Buffer.from("Hello from Crossmint SDK", "utf-8"),
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
});

const blockhash = (await connection.getLatestBlockhash()).blockhash;
const newMessage = new TransactionMessage({
    payerKey: new PublicKey(wallet.address),
    recentBlockhash: blockhash,
    instructions: [memoInstruction],
});

const transaction = new VersionedTransaction(newMessage.compileToV0Message());

const txHash = await wallet.sendTransaction({
    transaction,
});
```

### Delegated Signers

```ts
const newSigner = Keypair.generate();
await wallet.addDelegatedSigner(keypair.publicKey.toBase58());
const txHash = await wallet.sendTransaction({
    transaction,
    delegatedSigner: {
        type: "solana-keypair",
        address: keypair.publicKey.toBase58(),
        signer: newSigner,
    },
});
```

## EVM Examples

### Wallet Creation

#### Passkey Smart Wallets

```ts
const wallet = await crossmintWallets.getOrCreateWallet({
    chain: "base-sepolia",
    signer: {
        type: "passkey",
        name: "My Wallet",
    },
});
```

#### Keypair Smart Wallets

```ts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(generatePrivateKey());
const wallet = await crossmintWallets.getOrCreateWallet({
    chain: "base-sepolia",
    signer: {
        type: "external-wallet",
        address: account.address,
        viemAccount: account,
    },
});
```

### Sending Transactions

```ts
const transaction = await wallet.sendTransaction({
    to: "0x0000000000000000000000000000000000000042",
    data: "0xdeadbeef",
    value: BigInt(0),
});
```

### Signing Messages

```ts
const signature = await wallet.signMessage({
    message: "Hello from Crossmint SDK",
});
```
