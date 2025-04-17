# Solana iFrame Signer Test App

This application demonstrates the use of the Solana iFrame Signer with attestation validation from `@crossmint/client-signers`. It provides a way to test the SolanaIFrameSigner SDK by creating a server-side Solana wallet and interacting with it through an iframe.

## Features

- **Create Solana Wallet**: Server-side wallet creation with SOL airdrop (on devnet)
- **iFrame Signer Testing**: Test the iframe-based signer with attestation validation
- **Message Signing**: Sign messages using the iframe wallet
- **Activity Logging**: Track all operations in a detailed activity log
- **iFrame Preview**: Directly view the iframe wallet interface

## Setup

1. Clone the repository and navigate to the app directory:
   ```bash
   cd apps/wallets/solana-signer-test
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file with your API key:
   ```
   CROSSMINT_API_KEY=your_api_key_here
   SOLANA_NETWORK=devnet
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Create Wallet**:
   - Enter a name for your wallet
   - Click "Create Wallet"
   - The wallet details including public key and balance will be displayed

2. **Test Signer**:
   - Switch to the "Test Signer" tab
   - Click "Initialize Signer" to set up the iframe connection
   - After initialization, click "Connect Wallet" to connect to the wallet
   - Sign messages using the "Sign Message" button

3. **View iFrame**:
   - The iframe wallet UI is displayed at the bottom of the page
   - This shows the actual iframe that's used for signing operations

## Architecture

The application consists of:

1. **Server-Side**:
   - API route for wallet creation and management
   - Solana devnet connection for testing

2. **Client-Side**:
   - Next.js application with shadcn/ui components
   - Uses the `@crossmint/client-signers` SDK for wallet interactions
   - Mockup iframe for wallet operations

3. **Attestation System**:
   - Attestation validation built into the SDK
   - Secure communication between parent window and iframe

## Dependencies

- Next.js 15.3.0
- Shadcn UI components
- @solana/web3.js
- bs58 for Base58 encoding/decoding
- @crossmint/client-signers for Solana iframe signer integration
- @crossmint/client-sdk-window for iframe communication

## Notes

- This is a test application and should not be used in production
- The wallet's private key is exposed in the UI for demonstration purposes only
- All operations use the Solana devnet
- The attestation validation is handled by the SDK
