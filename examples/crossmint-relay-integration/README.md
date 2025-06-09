# Crossmint Wallet + Relay Instant Bridging Integration

This example demonstrates how to integrate Crossmint wallet creation with Relay instant bridging for seamless cross-chain transactions.

## Features

- **Crossmint Wallet Creation**: Create smart wallets using email authentication
- **Relay Instant Bridging**: Enable instant cross-chain transfers with low fees
- **Seamless UX**: No external tools or complex flows for end users
- **Multi-chain Support**: Works across EVM chains supported by both platforms

## Key Benefits

- **Web2-native Experience**: Users can create wallets and bridge assets using just their email
- **No Gas Fee Management**: Crossmint handles gas fees and transaction complexity
- **Instant Bridging**: 1-10 second cross-chain transactions via Relay
- **Error-free Flow**: Native app experience without external wallet connections

## Installation

```bash
npm install @crossmint/client-sdk-react-ui @reservoir0x/relay-sdk viem
```

## Usage

See the example components in this directory for complete implementation details.

## Architecture

1. **Authentication**: User signs in with email/social login via Crossmint
2. **Wallet Creation**: Smart wallet created automatically on preferred chain
3. **Bridge Setup**: Relay quote generated for cross-chain transfer
4. **Execution**: Transaction signed and executed through Crossmint wallet
5. **Completion**: Assets bridged instantly to destination chain
