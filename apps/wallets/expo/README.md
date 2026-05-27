# Expo Playground (React Native)

## Setup

```bash
cp .env.template .env.local
```

Fill in your Crossmint client API key in `.env.local`.

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

---

## E2E Tests

### Framework

Tests use [Maestro](https://maestro.mobile.dev) — a mobile UI testing framework that drives real iOS simulators and Android emulators via YAML flows. It does not require modifying the app and works with any React Native app.

Test flows live in `tests/e2e/specs/` and shared scripting utilities in `tests/shared/utils/`.

### Prerequisites

**1. Install Maestro CLI**

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Verify:

```bash
maestro --version
```

**2. Running device or simulator**

- **iOS**: an iOS Simulator must be booted (`npx expo run:ios` handles this automatically)
- **Android**: an Android Emulator must be running (`npx expo run:android` handles this automatically)

**3. App running with Metro**

Build and start the app first — Maestro drives an already-running app, it does not build it:

```bash
# iOS
pnpm playground:expo:ios

# Android
pnpm playground:expo:android
```

**4. Mailosaur credentials** (for auth tests)

Auth tests send a real OTP email and retrieve it via the [Mailosaur](https://mailosaur.com) API. Copy the template and fill in your credentials:

```bash
cp .env.maestro .env.maestro.local   # optional — or pass --env flags directly
```

Get the values from the team's shared secrets (same keys used by the web E2E tests):

| Variable | Description |
|----------|-------------|
| `MAILOSAUR_API_KEY` | Mailosaur API key |
| `MAILOSAUR_SERVER_ID` | Mailosaur server ID (also the email domain) |

### Running tests

**All tests:**

```bash
# from apps/wallets/expo/
pnpm test:maestro \
  --env MAILOSAUR_API_KEY=<key> \
  --env MAILOSAUR_SERVER_ID=<id>
```

**Single flow:**

```bash
maestro test tests/specs/auth/login.yaml \
  --env MAILOSAUR_API_KEY=<key> \
  --env MAILOSAUR_SERVER_ID=<id>
```

### Test structure

```
tests/
├── specs/
│   └── auth/
│       └── login.yaml            # Login flow (email OTP → wallet dashboard)
├── shared/
│   └── utils/
│       ├── generateEmail.js      # Generates a unique Mailosaur test email per run
│       └── getOtp.js             # Polls Mailosaur API and extracts the 6-digit OTP
└── scripts/
    └── notify-slack.js           # Parses JUnit results and posts to Slack (used by CI)
```
