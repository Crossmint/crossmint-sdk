# `@crossmint/client-sdk (beta)`

The Crossmint SDK allows you to offer wallet-less credit card purchases on your NFT drop. It takes 5 lines of code and 5 min to integrate, and is free to use for the seller. You’ll get the sales proceeds in SOL/ETH as if the user was paying with their own wallet.

Supported chains:

-   Solana
-   Polygon (for docs: contact us at sales at crossmint.io)
-   Ethereum L1 (end of March 2021)

To get started:

1. Fill out our form in https://www.crossmint.io/developers/onboarding (we'll review your project in under 24hr!)
2. Follow the instructions below to integrate with your code

## Demo of the user experience:

https://vimeo.com/671525311

---

## Migration guide to 0.1.X versions

Version 0.1.0 introduces breaking changes. To learn how to migrate from a version lower than 0.1.0, [check out the migration guide](https://docs.google.com/document/d/14IKpjrij7kU7Dr0I7rZkf0PyDNbXiklx2v4GuzUrFbw/edit?usp=sharing).

---

## You can check the full documentation at [docs.crossmint.io](https://docs.crossmint.io/)

---

## Quick Setup

### [I use React or Next.js in my app](packages/ui/react-ui/README.md)

### [I use any other technology in my app](packages/ui/vanilla-ui/README.md)

---

## Packages

### UI

These packages provide components for common UI frameworks.

| package                                                                                          | description                                     | npm                                                                                            |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [react-ui](https://github.com/CrossMint/crossmint-client-sdk/tree/main/packages/ui/react-ui)     | Components for React                            | [`@crossmint/client-sdk-react-ui`](https://npmjs.com/package/@crossmint/client-sdk-react-ui)   |
| [vanilla-ui](https://github.com/CrossMint/crossmint-client-sdk/tree/main/packages/ui/vanilla-ui) | Made using web components, they work everywhere | [`@crossmint/client-sdk-react-ui`](https://npmjs.com/package/@crossmint/client-sdk-vanilla-ui) |

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
yarn run lerna version
yarn run publish
```

---

## [Changelog](https://docs.google.com/document/d/e/2PACX-1vR5NzVS2msrCMZxlcfBgAT-Y8kAypeKqH_WBeNiwVTmyEzLZvJBWrKrz_966-d3jumwIBi94IXGT6Wp/pub)
