# `@crossmint/client-sdk (beta)`

CrossMint massively simplifies the user experience on your NFT sales, by allowing your users to pay with credit card and without installing a wallet. It takes 10 lines of code and 5 min to integrate, and is free to use for the seller. You’ll get the sales proceeds in SOL/ETH as if the user was paying with their own wallet.

Supported chains:
* Solana
* Polygon (coming Jan 2021)
* Ethereum L1 (Feb 2021)

To get started, request a client ID from our sales team (email: sales (at) crossmint.io), import our client-side libraries into your minting website, and follow the instructions below.

**CrossMint is currently in Beta. In order for CrossMint to work with your Candy Machine, contact us at sales (at) crossmint.io .**

<p align="center">
  <img src="https://github.com/CrossMint/crossmint-client-sdk/raw/main/usageExample.gif?raw=true" alt="Usage Example" />
</p>

## Quick Setup (Next.js)

### Install

```shell
yarn add @crossmint/client-sdk-react-ui
```

### Setup

Require the CrossMint styles by adding `require('@crossmint/client-sdk-react-ui/styles.css');` to your app.

Import `CrossMintProvider`, wrap your app with it at the top level and pass your clientId (reach out to sales (at) crossmint.io to get one).

```javascript
import { AppProps } from "next/app";

import { CrossMintProvider } from "@crossmint/client-sdk-react-ui";

// Use require instead of import, and order matters
require("../styles/globals.css");
require("@crossmint/client-sdk-react-ui/styles.css");

export default function App({ Component, pageProps }: AppProps) {
    return (
        <CrossMintProvider clientId="<YOUR_CLIENT_ID>">
            <Component {...pageProps} />
        </CrossMintProvider>
    );
}
```

### Usage

Import the Pay with `CrossMintButton` into your app wherever you would like.

```javascript
import { CrossMintButton } from "@crossmint/client-sdk-react-ui";

export default function Index() {
    return (
        <CrossMintButton
            collectionTitle="<TITLE_FOR_YOUR_COLLECTION>"
            collectionDescription="<DESCRIPTION_OF_YOUR_COLLECTION>"
            collectionPhoto="<OPT_URL_TO_PHOTO_COVER>"
        />
    );
}
```

See [react-ui](https://github.com/CrossMint/crossmint-client-sdk/tree/main/packages/ui/react-ui) for more optional customization parameters.

## Packages

### UI

These packages provide components for common UI frameworks.

| package                                                                                      | description          | npm                                                                                          |
| -------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| [react-ui](https://github.com/CrossMint/crossmint-client-sdk/tree/main/packages/ui/react-ui) | Components for React | [`@crossmint/client-sdk-react-ui`](https://npmjs.com/package/@crossmint/client-sdk-react-ui) |

### Starter Projects

These packages provide projects that you can use to start building an app with built-in CrossMint support.

| package                                                                                                           | description                                                             |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [example](https://github.com/CrossMint/crossmint-client-sdk/tree/main/packages/starter/example)                   | [Next.js](https://nextjs.org) project using React                       |
| [react-ui-starter](https://github.com/CrossMint/crossmint-client-sdk/tree/main/packages/starter/react-ui-starter) | [Create React App](https://create-react-app.dev) project using React UI |
| [nextjs-starter](https://github.com/CrossMint/crossmint-client-sdk/tree/main/packages/starter/nextjs-starter)     | [Next.js](https://nextjs.org) project using React                       |

## Build from Source

1. Clone the project:

```shell
git clone https://github.com/CrossMint/crossmint-client-sdk.git
```

2. Install dependencies:

```shell
cd crossmint-client-sdk
yarn install
```

3. Build all packages:

```shell
yarn build
```

4. Run locally:

```shell
cd packages/starter/react-ui-starter
yarn start
```

## Publish (for the crossmint team)

```shell
yarn build
yarn publish
```
