# Smart Wallets Demo (React Starter Kit)

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

1. Copy the `.env.example` file in the root directory in which this README.md is contained and rename the copy to `.env`.
2. Open the `.env` file and fill in the necessary values as described below:
    > The credentials can be found in our shared 1Pass (see admin for access).

```plaintext
REACT_APP_CROSSMINT_API_KEY_PROD=your_crossmint_api_key_for_production
REACT_APP_CROSSMINT_API_KEY_STG=your_crossmint_api_key_for_staging

REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id

REACT_APP_WEB3_AUTH_CLIENT_ID_PROD=your_web3_auth_client_id_for_production
REACT_APP_WEB3_AUTH_CLIENT_ID_STG=your_web3_auth_client_id_for_staging
REACT_APP_WEB3_AUTH_NETWORK_PROD=your_web3_auth_network_for_production
REACT_APP_WEB3_AUTH_NETWORK_STG=your_web3_auth_network_for_staging
REACT_APP_WEB3_AUTH_VERIFIER_ID_PROD=your_web3_auth_verifier_id_for_production
REACT_APP_WEB3_AUTH_VERIFIER_ID_STG=your_web3_auth_verifier_id_for_staging

GOOGLE_TEST_EMAIL=
GOOGLE_TEST_PASSWORD=
GOOGLE_TEST_ACCOUNT_PRIVATE_KEY=
```

## Starting the Application

After configuring your environment variables, start the development server by opening a terminal in the directory containing this `README.md` file and running the following command:

```bash
pnpm run dev
```

This command will launch the application on `http://localhost:3000` by default, allowing you to view and interact with it in your web browser.

### Running the tests

Runs the end-to-end tests.

```bash
pnpm test:e2e
```

Starts the interactive UI mode.

```bash
pnpm test:e2e-ui
```
