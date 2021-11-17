# `@crossmint/mint-adapter`

CrossMint is a service that allows you to offer wallet-less credit card checkout for Solana NFTs in under 10 lines of code. All you need to do is import our client-side libraries into your minting website, pass it your Metaplex Candy Machine ID, and sit back and let us take care of the rest. You’ll get the sales proceeds in SOL as if the user was paying with a Solana wallet.

**CrossMint is currently in alpha. In order for CrossMint to work with your Candy Machine, you must submit your information to our form [here](https://google.com).**


<p align="center">
  <img src="https://github.com/Paella-Labs/mint-adapter/raw/main/usageExample.gif" alt="Usage Example" />
</p>

## Quick Setup (Next.js)

### Install
```shell
yarn add @crossmint/mint-adapter-react-ui
```

### Setup

Require the CrossMint styles by adding `require('@crossmint/mint-adapter-react-ui/styles.css');` to your app.

Import `CrossMintProvider` and wrap your app with it at the top level.

```javascript
import { AppProps } from 'next/app';

import { CrossMintProvider } from '@crossmint/mint-adapter-react-ui';

// Use require instead of import, and order matters
require('../styles/globals.css');
require('@crossmint/mint-adapter-react-ui/styles.css');

export default function App({ Component, pageProps }: AppProps) {
    return (
        <CrossMintProvider>
            <Component {...pageProps} />
        </CrossMintProvider>
    );
}
```

### Usage

Import the Pay with `CrossMintButton` into your app wherever you would like, and enter your Candy Machine ID.

```javascript
import { CrossMintButton } from '@crossmint/mint-adapter-react-ui';

export default function Index(){
    return (
        <div
            className="your-container"
        >
            <CrossMintButton candyMachineId="<YOUR_CANDY_MACHINE_ID>" />
        </div>
    );
}

```

## Packages

### UI
These packages provide components for common UI frameworks.

| package                                                                                          | description                                           | npm                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [react-ui](https://github.com/Paella-Labs/mint-adapter/tree/main/packages/ui/react-ui)       | Components for React      | [`@crossmint/mint-adapter-react-ui`](https://npmjs.com/package/@crossmint/mint-adapter-react-ui)       |


### Starter Projects
These packages provide projects that you can use to start building an app with built-in CrossMint support.

| package                                                                                                               | description                                                                | npm                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [example](https://github.com/Paella-Labs/mint-adapter/tree/main/packages/starter/example)                         | Demo of UI components                                                      | [`@crossmint/mint-adapter-example`](https://npmjs.com/package/@crossmint/mint-adapter-example)                         |
| [react-ui-starter](https://github.com/Paella-Labs/mint-adapter/tree/main/packages/starter/react-ui-starter)       | [Create React App](https://create-react-app.dev) project using React UI    | [`@crossmint/mint-adapter-react-ui-starter`](https://npmjs.com/package/@crossmint/mint-adapter-react-ui-starter)       |
| [nextjs-starter](https://github.com/Paella-Labs/mint-adapter/tree/main/packages/starter/nextjs-starter)           | [Next.js](https://nextjs.org) project using React                          | [`@crossmint/mint-adapter-nextjs-starter`](https://npmjs.com/package/@crossmint/mint-adapter-nextjs-starter)           |



## Build from Source

1. Clone the project:
```shell
git clone https://github.com/Paella-Labs/mint-adapter.git
```

2. Install dependencies:
```shell
cd mint-adapter
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
