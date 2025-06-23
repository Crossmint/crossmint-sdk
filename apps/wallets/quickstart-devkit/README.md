
<div align="center">
<img width="200" alt="Image" src="https://github.com/user-attachments/assets/8b617791-cd37-4a5a-8695-a7c9018b7c70" />
<br>
<br>
<h1>Wallets Quickstart Devkit</h1>

<div align="center">
<a href="https://docs.crossmint.com/introduction/platform/wallets">Docs</a> | <a href="https://github.com/crossmint">See all quickstarts</a>
</div>

<br>
<br>
<img src="https://github.com/user-attachments/assets/76a983ab-499e-4d12-af7a-0ae17cb0b6cd" alt="Image" width="full">
</div>

## Introduction
Create and interact with Crossmint wallets in Solana or EVM. This developer kit is designed to work for internal development purposes ONLY. It supports using Crossmint auth and Bring Your Own Wallet (BYOW).

**Supported features:**
- Create a wallet
- View its balance for ETH, SOL and SPL tokens
- Send a transaction
- Add delegated signers to allow third parties to sign transactions on behalf of your wallet

## Setup

1. Install all dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. Set up the environment variables:
```bash
cp .env.template .env
```

3. Get a Crossmint API key from [here](https://docs.crossmint.com/introduction/platform/api-keys/client-side) and add it to the `.env` file.
```bash
NEXT_PUBLIC_CROSSMINT_API_KEY=your_api_key
```

for testing anything regarding BYOA, you'll need an API key. 

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Using in production
1. Create a [production API key](https://docs.crossmint.com/introduction/platform/api-keys/client-side).
