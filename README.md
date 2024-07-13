# `crossmint-sdk (beta)`

## You can check the full documentation at [docs.crossmint.com](https://docs.crossmint.com/)

The Crossmint SDK allows you to offer wallet-less credit card purchases on your NFT drop. It takes 5 lines of code and 5 minutes to integrate. It's free to use for the seller. You’ll get the sales proceeds in SOL/ETH as if the user was paying with their own wallet.

## Get Started

To get started and for full integration instructions visit [our documentation](https://docs.crossmint.com/).

## Migration guide to 0.1.X versions

Version 0.1.0 introduces breaking changes. To learn how to migrate from a version lower than 0.1.0, [check out the migration guide](https://docs.google.com/document/d/14IKpjrij7kU7Dr0I7rZkf0PyDNbXiklx2v4GuzUrFbw/edit?usp=sharing).

## Migration guide to 0.2.X versions

Version 0.2.0 introduces breaking changes. To learn how to migrate from a version lower than 0.2.0, [check out the migration guide](https://docs.google.com/document/d/1mA0W-iAs0nHHW0ANX0TfZ5qrzxPGxNchPj13W6cHc-Y/edit?usp=sharing).

## [Changelog](https://docs.google.com/document/d/e/2PACX-1vR5NzVS2msrCMZxlcfBgAT-Y8kAypeKqH_WBeNiwVTmyEzLZvJBWrKrz_966-d3jumwIBi94IXGT6Wp/pub)

---

## Build from Source

1. Clone the project:

```shell
git clone https://github.com/Crossmint/crossmint-sdk.git
```

2. Use the specified node version in .nvmrc file:
```shell
nvm use
```

3. Install dependencies:

```shell
cd crossmint-sdk
pnpm install
```

4. Build all packages:

```shell
pnpm build
```

5. Run locally:

```shell
cd packages/client/starters/react-ui-starter
pnpm start
```

Remember that if doing changes on the `@crossmint/client-sdk-react-ui` package, they wont be reflected into your project until you rebuild the package and install it back again:

```
# Inside `packages/client/ui/react-ui`. Rebuild package
pnpm build
```

```
# Inside the starter. Eg. `packages/client/startes/nextjs-starter`. Install rebuilt package
pnpm install
```

## Publish (for the crossmint team)

```shell
pnpm build
pnpm test
pnpm run lerna version
pnpm build
pnpm run publish
```
