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
        exports: ["CrossmintProvider", "CrossmintWalletProvider", "useWallet", "ExportPrivateKeyButton"],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintWalletProvider: "Wallet creation and management",
        },
        walletMethods: {
            enabled: true,
            description:
                "The `wallet` instance returned by `useWallet()` provides methods for token transfers, balances, signing, and more.\n\nSince the React SDK wraps the Wallets SDK, see the **[Wallets SDK Reference](/sdk-reference/wallets/classes/Wallet)** for complete documentation.",
            baseClass: "Wallet",
            chainClasses: ["EVMWallet", "SolanaWallet", "StellarWallet"],
            docsBasePath: "/sdk-reference/wallets/classes",
            skip: ["approve", "approveTransaction", "experimental_apiClient", "from"],
        },
        getStartedExamples: {
            setup: "walletProviderSetup",
            quickExample: "walletQuickExample",
            quickExampleIntro: "Once providers are set up, use hooks to access wallet state:",
        },
    },
};

const MANUAL_RETURNS = {
    useWallet: [
        {
            name: "wallet",
            type: {
                type: "union",
                types: [
                    { type: "reference", name: "Wallet" },
                    { type: "intrinsic", name: "undefined" },
                ],
            },
            comment: {
                summary: [{ kind: "text", text: "The current wallet instance, or undefined if no wallet is loaded." }],
            },
        },
        {
            name: "status",
            type: { type: "reference", name: "WalletStatus" },
            comment: {
                summary: [
                    {
                        kind: "text",
                        text: "Current wallet status. Options: `not-loaded` | `in-progress` | `loaded` | `error`.",
                    },
                ],
            },
        },
        {
            name: "getOrCreateWallet",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [{ name: "args", type: { type: "reference", name: "WalletArgsFor<Chain>" } }],
                            type: {
                                type: "reference",
                                name: "Promise",
                                typeArguments: [
                                    {
                                        type: "union",
                                        types: [
                                            { type: "reference", name: "Wallet" },
                                            { type: "intrinsic", name: "undefined" },
                                        ],
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
            comment: { summary: [{ kind: "text", text: "Creates a new wallet or retrieves an existing one." }] },
        },
    ],
};

generate({
    products: PRODUCTS,
    manualReturns: MANUAL_RETURNS,
    ...parseCLIFlags(),
});
