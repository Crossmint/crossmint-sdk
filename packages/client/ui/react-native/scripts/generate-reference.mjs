#!/usr/bin/env node
/**
 * SDK Reference Docs Generator (React Native)
 *
 * Thin caller — delegates to the shared engine with React Native-specific config.
 * Run: pnpm generate:docs
 */

import { generate, parseCLIFlags } from "../../scripts/generate-reference.mjs";

const PRODUCTS = {
    wallets: {
        outdir: "wallets",
        navPrefix: "sdk-reference/wallets/react-native",
        title: "React Native SDK",
        description: "React Native SDK reference for Crossmint wallets",
        packageName: "@crossmint/client-sdk-react-native-ui",
        npmUrl: "https://www.npmjs.com/package/@crossmint/client-sdk-react-native-ui",
        installSnippet: null,
        intro: "The Crossmint React Native SDK (`@crossmint/client-sdk-react-native-ui`) provides React Native components and hooks for integrating Crossmint wallets into your mobile application.",
        exports: [
            "CrossmintProvider",
            "CrossmintWalletProvider",
            "useWallet",
            "useWalletEmailSigner",
            "ExportPrivateKeyButton",
        ],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintWalletProvider: "Wallet creation and management",
        },
        walletMethods: {
            enabled: true,
            description:
                "The `wallet` instance returned by `useWallet()` provides methods for token transfers, balances, signing, and more.\n\nSince the React Native SDK wraps the Wallets SDK, see the **[Wallets SDK Reference](/sdk-reference/wallets/classes/Wallet)** for complete documentation.",
            baseClass: "Wallet",
            chainClasses: ["EVMWallet", "SolanaWallet", "StellarWallet"],
            docsBasePath: "/sdk-reference/wallets/classes",
            skip: ["approve", "approveTransaction", "experimental_apiClient", "from"],
        },
        getStartedExamples: {
            setup: "rnWalletProviderSetup",
            quickExample: "rnWalletQuickExample",
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
    useWalletEmailSigner: [
        {
            name: "needsAuth",
            type: { type: "intrinsic", name: "boolean" },
            comment: {
                summary: [
                    {
                        kind: "text",
                        text: "Whether the email signer currently requires authentication (OTP verification).",
                    },
                ],
            },
        },
        {
            name: "sendEmailWithOtp",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [],
                            type: {
                                type: "reference",
                                name: "Promise",
                                typeArguments: [{ type: "intrinsic", name: "void" }],
                            },
                        },
                    ],
                },
            },
            comment: {
                summary: [{ kind: "text", text: "Sends a one-time password to the user's email address." }],
            },
        },
        {
            name: "verifyOtp",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [{ name: "otp", type: { type: "intrinsic", name: "string" } }],
                            type: {
                                type: "reference",
                                name: "Promise",
                                typeArguments: [{ type: "intrinsic", name: "void" }],
                            },
                        },
                    ],
                },
            },
            comment: {
                summary: [{ kind: "text", text: "Verifies the one-time password entered by the user." }],
            },
        },
        {
            name: "reject",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [{ name: "error", type: { type: "reference", name: "Error" } }],
                            type: { type: "intrinsic", name: "void" },
                        },
                    ],
                },
            },
            comment: {
                summary: [{ kind: "text", text: "Rejects the current authentication request with an error." }],
            },
        },
    ],
};

generate({
    products: PRODUCTS,
    manualReturns: MANUAL_RETURNS,
    ...parseCLIFlags(),
});
