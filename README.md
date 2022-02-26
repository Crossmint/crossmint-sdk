# `@crossmint/client-sdk (beta)`

The Crossmint SDK allows you to offer wallet-less credit card purchases on your NFT drop. It takes 10 lines of code and 5 min to integrate, and is free to use for the seller. You’ll get the sales proceeds in SOL/ETH as if the user was paying with their own wallet.

Supported chains:

-   Solana
-   Polygon (private beta, contact us at sales at crossmint.io)
-   Ethereum L1 (end of March 2021)

To get started:

1. Fill out our form in https://www.crossmint.io/developers/onboarding (we'll review your project in under 24hr!)
2. Follow the instructions below to integrate with your code

## Demo of the user experience:

https://vimeo.com/671525311

---

## Quick Setup (Next.js)

### 1. Install

```shell
yarn add @crossmint/client-sdk-react-ui
```

### 2. Set up

On your main App file (e.g. app.tsx):

1. Require the CrossMint styles by adding `require('@crossmint/client-sdk-react-ui/styles.css');` 
2. Import `CrossMintProvider`, wrap your app with it at the top level and pass the clientId you received after filling in [the onboarding form](https://www.crossmint.io/developers/onboarding).

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

### 3. Usage

Go to the main file where your Candy Machine button lives. For example, Home.tsx.

There, just import the Pay with `CrossMintButton`, and add it in the UI.

**Important**: be sure to test that the Crossmint button is visible even if a user didn't connect their wallet! Else, your users without wallets won't be able to use it.

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

Finally, make sure you replace the following values in the CrossMintButton component:

-   `<TITLE_FOR_YOUR_COLLECTION>`: Example: "My NFT collection"
-   `<DESCRIPTION_OF_YOUR_COLLECTION>`: Example: "The most fun community of 999 generative art monkeys in Solana"
-   `<OPT_URL_TO_PHOTO_COVER>`: Full URL to an image for your collection. Example: "https://i.picsum.photos/id/542/200/300.jpg?hmac=qD8M4ejDPlEc69pGT21BzB7CDiWOcElb_Ke7V8POjm8"

See [react-ui](https://github.com/CrossMint/crossmint-client-sdk/tree/main/packages/ui/react-ui) for more optional customization parameters.

---

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

---

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

Remember that if doing changes on the `@crossmint/client-sdk-react-ui` package, they wont be reflected into your project until you rebuild the package and install it back again:

```
# Inside `packages/ui/react-ui`. Rebuild package
yarn build
```

```
# Inside the starter. Eg. `packages/starter/nextjs-starter`. Install rebuilt package
yarn
```

---

## Publish (for the crossmint team)

```shell
yarn build
yarn publish
```
