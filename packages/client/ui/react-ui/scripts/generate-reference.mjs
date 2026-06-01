#!/usr/bin/env node
/**
 * SDK Reference Docs Generator (React)
 *
 * Thin caller — delegates to the shared engine with React-specific config.
 * Run: pnpm generate:docs
 */

import { generate, parseCLIFlags } from "../../scripts/generate-reference.mjs";

const PRODUCTS = {
    wallets: {
        outdir: "wallets",
        navPrefix: "sdk-reference/wallets/react",
        title: "React SDK",
        description: "React SDK reference for Crossmint wallets",
        packageName: "@crossmint/client-sdk-react-ui",
        npmUrl: "https://www.npmjs.com/package/@crossmint/client-sdk-react-ui",
        installSnippet: "client-sdk-react-ui-installation-cmd.mdx",
        intro: "The Crossmint React SDK (`@crossmint/client-sdk-react-ui`) provides React components and hooks for integrating Crossmint wallets into your application.",
        versionBanner: `<Note>
**This page has been updated for Wallets SDK V1.** If you are using the previous version,
see the [previous version of this page](/sdk-reference/wallets/v0/react/{page}) or the [V1 migration guide](/wallets/guides/migrate-to-v1).
</Note>`,
        exports: [
            "CrossmintProvider",
            "CrossmintWalletProvider",
            "useWallet",
            "useCrossmintAuth",
            "ExportPrivateKeyButton",
        ],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintWalletProvider: "Wallet creation and management",
        },
        walletMethods: {
            enabled: true,
            description:
                "The `wallet` instance returned by `useWallet()` provides methods for token transfers, balances, signing, and more.\n\nSince the React SDK wraps the Wallets SDK, see the **[Wallets SDK Reference](/sdk-reference/wallets/typescript/classes/Wallet)** for complete documentation.",
            baseClass: "Wallet",
            chainClasses: ["EVMWallet", "SolanaWallet", "StellarWallet"],
            docsBasePath: "/sdk-reference/wallets/typescript/classes",
            skip: ["approve", "approveTransaction", "from"],
        },
        getStartedExamples: {
            setup: "walletProviderSetup",
            quickExample: "walletQuickExample",
            quickExampleIntro: "Once providers are set up, use hooks to access wallet state:",
        },
    },
};

generate({
    products: PRODUCTS,
    ...parseCLIFlags(),
});
