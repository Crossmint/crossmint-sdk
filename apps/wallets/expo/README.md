# Expo Playground (React Native)

## Setup

```bash
cp .env.template .env
```

Fill in your Crossmint client API key in `.env`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_CROSSMINT_API_KEY` | Crossmint client API key | — |
| `EXPO_PUBLIC_CHAIN` | Default chain (`base-sepolia`, `solana`, `stellar`) | `base-sepolia` |

## Run

From the repo root:

```bash
pnpm playground:expo:ios
# or
pnpm playground:expo:android
```
