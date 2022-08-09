# `@crossmint/client-sdk (beta)`

## You can check the full documentation at [docs.crossmint.io](https://docs.crossmint.io/)

---

The Crossmint SDK allows you to offer wallet-less credit card purchases on your NFT drop. It takes 5 lines of code and 5 minutes to integrate. It's free to use for the seller. You’ll get the sales proceeds in SOL/ETH as if the user was paying with their own wallet.

## Get Started

Crossmint supports [Solana](https://docs.crossmint.io/accept-credit-cards/integration-guides/solana-candy-machine), [Polygon](https://docs.crossmint.io/accept-credit-cards/integration-guides/polygon)
, and [Ethereum](https://docs.crossmint.io/accept-credit-cards/integration-guides/ethereum). To get started and for full integration instructions visit [our documentation](https://docs.crossmint.io/).

## How to mint an NFT using Crossmint

Watch [our demo](https://www.youtube.com/watch?v=4NTgDFU-lms) on YouTube on how to mint an NFT using Crossmint.

[![Crossmint Demo](https://img.youtube.com/vi/4NTgDFU-lms/0.jpg)](https://www.youtube.com/watch?v=4NTgDFU-lms)

## Migration guide to 0.1.X versions

Version 0.1.0 introduces breaking changes. To learn how to migrate from a version lower than 0.1.0, [check out the migration guide](https://docs.google.com/document/d/14IKpjrij7kU7Dr0I7rZkf0PyDNbXiklx2v4GuzUrFbw/edit?usp=sharing).

## [Changelog](https://docs.google.com/document/d/e/2PACX-1vR5NzVS2msrCMZxlcfBgAT-Y8kAypeKqH_WBeNiwVTmyEzLZvJBWrKrz_966-d3jumwIBi94IXGT6Wp/pub)

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

## Publish (for the crossmint team)

```shell
yarn build
yarn test
yarn run lerna version
yarn build
yarn run publish
```
