<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/Crossmint/crossmint-sdk">
    <img src="https://github.com/user-attachments/assets/573d5995-831f-4e27-ab9e-9ab346c9c680" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Smart Wallets Demo (Nextjs Starter Kit)</h3>

  <p align="center">
    This application demonstrates the use of Abstract Accounts with a built-in passkey authenticator. Simply sign in with Google, authorize your passkey, and create your smart wallet in seconds.
    <br />
    <a href="https://github.com/Crossmint/crossmint-sdk"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/Crossmint/crossmint-sdk">todo:View Demo</a>
    ·
    <a href="https://github.com/Crossmint/crossmint-sdk/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/Crossmint/crossmint-sdk/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

![Smart Wallets Demo (Nextjs Starter Kit) Screenshot](https://github.com/user-attachments/assets/5248334a-bc8b-4906-a8ef-f83e3041fed6)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

-   [![Next.js](https://img.shields.io/badge/next%20js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
-   [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
-   [![Crossmint](https://img.shields.io/badge/Crossmint-04CD6C?style=for-the-badge&logoColor=04CD6C&link=https://www.crossmint.com/)](https://www.crossmint.com/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.

### Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js (v20.12 or later)
-   npm (comes with Node.js)
-   pnpm (`npm install -g pnpm`)

### Installation

1. todo: Get a free API Key at [https://example.com](https://example.com)
2. Clone the repo
    ```sh
    git clone https://github.com/Crossmint/crossmint-sdk.git
    ```
3. Install PNPM packages
    ```sh
    pnpm i
    ```
4. Where this README.md is contained, rename the `.env.example` file to `.env` and add your API key to the file.
    ```bash
    NEXT_PUBLIC_CROSSMINT_API_KEY="ENTER YOUR CROSSMINT API KEY";
    ```
5. Start the development server
    ```sh
    pnpm dev
    ```
6. Once you start the nextjs development server, the application can be found at `http://localhost:3000`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->

## Usage

Spin up your own instance of the Smart Wallets Demo in under 5 minutes!

### 1. Adding the Provider

First, wrap your application with the `CrossmintAuthProvider` to provide authentication context to your components. This is typically done in the root of your app.

```tsx
import { CrossmintAuthProvider } from "@crossmint/client-sdk-react-ui";

export default function App({ Component, pageProps }) {
  return (
    <CrossmintAuthProvider
      apiKey="YOUR_CROSSMINT_API_KEY"
      embeddedWallets={{
        createOnLogin: "all-users",
        defaultChain: "polygon-amoy",
        type: "evm-smart-wallet",
      }}
    >
      <Component {...pageProps} />
    </CrossmintAuthProvider>
  );
}
```

### 2. Using the useAuth Hook

Next, use the useAuth hook in your components to access the JWT, wallet state, and login/logout functions.

```tsx
import { useAuth } from "@crossmint/client-sdk-react-ui";

export default function Home() {
  const { jwt, wallet, login, logout } = useAuth();

  return (
    <div>
      {jwt ? (
        <button onClick={logout}>Log out</button>
      ) : (
        <button onClick={login}>Log in</button>
      )}
    </div>
  );
}
```

_For more examples, please refer to the [Documentation](https://example.com)_

<p align="right">(<a href="#readme-top">back to top</a>)</p>
