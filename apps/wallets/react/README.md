# React Playground (Next.js)

## Setup

```bash
cp .env.template .env.local
```

Fill in your Crossmint client API key in `.env.local`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_CROSSMINT_API_KEY` | Crossmint client API key | — |
| `NEXT_PUBLIC_CHAIN` | Default chain (`base-sepolia`, `solana`, `stellar`) | `base-sepolia` |
| `NEXT_PUBLIC_AUTH_MODE` | Auth mode: `email`, `phone`, `passkey`, or `jwt` | `email` |

## Run

From the repo root:

```bash
pnpm playground:react
```
