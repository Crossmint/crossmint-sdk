# Smart Wallets Demo (Nextjs Starter Kit)

This application demonstrates the use of Abstract Accounts with a built-in passkey authenticator. Simply sign in with Google, authorize your passkey, and create your smart wallet in seconds.

## Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js (v20.12 or later)
-   npm (comes with Node.js)
-   pnpm (`npm install -g pnpm`)

After installing the prerequisites, clone the repository and install the dependencies:

```bash
git clone <repository-url>
pnpm i
```

## Configuration

Before running the application, you need to set up your environment variables:

1. Where this README.md is contained, rename the `.env.example` file to `.env`.
2. Open the `.env` file and fill in the necessary values as described below:
    > The credentials can be found in our shared 1Pass (see admin for access).

```plaintext
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_CROSSMINT_API_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Starting the Application

After configuring your environment variables, start the development server by opening a terminal in the directory containing this `README.md` file and running the following command:

```bash
pnpm dev
```

Once you start the nextjs development server, the application can be found at `http://localhost:3000`.
