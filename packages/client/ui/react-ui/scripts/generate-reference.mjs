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
            name: "getWallet",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [
                                {
                                    name: "props",
                                    type: { type: "reference", name: "Pick<ClientSideWalletArgsFor<Chain>, \"chain\" | \"alias\">" },
                                },
                            ],
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
            comment: {
                summary: [{ kind: "text", text: "Retrieves an existing wallet. Returns undefined if no wallet is found." }],
            },
        },
        {
            name: "createWallet",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [
                                {
                                    name: "props",
                                    type: { type: "reference", name: "ClientSideWalletCreateArgs<Chain>" },
                                },
                            ],
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
            comment: {
                summary: [{ kind: "text", text: "Creates a new wallet with the specified chain and recovery signer." }],
            },
        },
        {
            name: "createDeviceSigner",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [],
                            type: {
                                type: "union",
                                types: [
                                    { type: "reference", name: "Promise<DeviceSignerDescriptor>" },
                                    { type: "intrinsic", name: "undefined" },
                                ],
                            },
                        },
                    ],
                },
            },
            comment: {
                summary: [
                    {
                        kind: "text",
                        text: "Creates a device signer using the provider's key storage. Returns undefined if device signing is not available.",
                    },
                ],
            },
        },
        {
            name: "createPasskeySigner",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [
                                {
                                    name: "passkeyName",
                                    type: { type: "intrinsic", name: "string" },
                                },
                            ],
                            type: { type: "reference", name: "Promise<RegisterSignerPasskeyParams>" },
                        },
                    ],
                },
            },
            comment: {
                summary: [
                    {
                        kind: "text",
                        text: "Creates a passkey signer via WebAuthn biometric prompt. EVM only.",
                    },
                ],
            },
        },
    ],
};

generate({
    products: PRODUCTS,
    manualReturns: MANUAL_RETURNS,
    ...parseCLIFlags(),
});
