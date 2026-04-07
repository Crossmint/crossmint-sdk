# Wallets Playground Apps

Interactive playground apps for testing Crossmint wallet operations against the local SDK source.

## Apps

| App | Path | Run command |
|-----|------|-------------|
| **React (Next.js)** | `apps/wallets/react/` | `pnpm playground:react` |
| **Expo (React Native)** | `apps/wallets/expo/` | `pnpm playground:expo:ios` or `pnpm playground:expo:android` |
| **Quickstart Devkit** | `apps/wallets/quickstart-devkit/` | See its own README |

## Environment Variables

Copy `.env.template` in this directory and fill in your values:

```bash
cp apps/wallets/.env.template apps/wallets/react/.env.local
cp apps/wallets/.env.template apps/wallets/expo/.env
```

| Variable | Used by | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CROSSMINT_API_KEY` | React | Crossmint client API key |
| `NEXT_PUBLIC_CHAIN` | React | Default chain (`base-sepolia`, `solana`, `stellar`) |
| `NEXT_PUBLIC_AUTH_MODE` | React | Auth mode: `email` (default), `phone`, `passkey`, or `jwt` |
| `EXPO_PUBLIC_CROSSMINT_API_KEY` | Expo | Crossmint client API key for mobile |

## Feature Coverage

Both apps cover:

- **Authentication** — Email sign-in, JWT/BYOA sign-in, sign-out
- **Balance** — View balance, refresh, get test USDXM (faucet)
- **Wallets** — Fetch wallet details, create wallet, switch chains (EVM/Base Sepolia, Solana, Stellar), copy address
- **Signers** — Fetch registered signers, add signer (device, passkey, external wallet), set signer, `useSigner` hook, OTP recovery check, remove signer
- **Transfers** — Token selection, recipient/amount input, signer selection, send transaction, view status
- **Activity** — List past transfers (sent/received), detail view (type, amount, token, addresses, timestamp, hash)
- **Signing** — Sign arbitrary message, sign EIP-712 typed data

The React app additionally supports multiple auth modes (email, phone recovery, passkey signer, JWT/BYOA) via the `NEXT_PUBLIC_AUTH_MODE` environment variable.
