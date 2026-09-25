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
    auth: {
        outdir: "auth",
        navPrefix: "sdk-reference/auth/react",
        title: "React SDK",
        description: "React SDK reference for Crossmint authentication",
        packageName: "@crossmint/client-sdk-react-ui",
        npmUrl: "https://www.npmjs.com/package/@crossmint/client-sdk-react-ui",
        installSnippet: "client-sdk-react-ui-installation-cmd.mdx",
        intro: "The Crossmint React SDK (`@crossmint/client-sdk-react-ui`) provides React components and hooks for integrating Crossmint authentication into your application, including email OTP, social login (OAuth), and session management.",
        exports: ["CrossmintProvider", "CrossmintAuthProvider", "useCrossmintAuth", "EmbeddedAuthForm"],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintAuthProvider: "Authentication state, login/logout, and the auth modal",
            EmbeddedAuthForm: "Renders the Crossmint auth form inline instead of in a modal",
        },
        getStartedExamples: {
            setup: "authProviderSetup",
            quickExample: "authQuickExample",
            quickExampleIntro: "Once providers are set up, use the `useCrossmintAuth` hook to access auth state:",
        },
    },
    agents: {
        outdir: "agents",
        navPrefix: "sdk-reference/agents/react",
        title: "React SDK",
        description: "React SDK reference for Crossmint agent payments",
        packageName: "@crossmint/client-sdk-react-ui",
        npmUrl: "https://www.npmjs.com/package/@crossmint/client-sdk-react-ui",
        installSnippet: "client-sdk-react-ui-installation-cmd.mdx",
        intro: "The Crossmint React SDK (`@crossmint/client-sdk-react-ui`) provides the user-facing pieces of agent card payments: saving a card, verifying an order intent's allowance with the card network, re-collecting a saved card's CVC, and collecting a merchant password for an agent checkout without it ever reaching your app. Agent wallets use the same wallet providers and hooks as the [Wallets React SDK](/sdk-reference/wallets/react/get-started).",
        exports: [
            "CrossmintProvider",
            "CrossmintPaymentMethodManagement",
            "OrderIntentVerification",
            "CrossmintCvcRecollection",
            "CrossmintProtectedInput",
        ],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintPaymentMethodManagement: "Saved payment method management UI",
        },
        getStartedExamples: {
            setup: "agentsProviderSetup",
            quickExample: "agentsQuickExample",
            quickExampleIntro: "Once the provider is set up, let the user save a card your agent can pay with:",
        },
    },
    checkout: {
        outdir: "checkout",
        navPrefix: "sdk-reference/checkout/react",
        title: "React SDK",
        description: "React SDK reference for Crossmint checkout",
        packageName: "@crossmint/client-sdk-react-ui",
        npmUrl: "https://www.npmjs.com/package/@crossmint/client-sdk-react-ui",
        installSnippet: "client-sdk-react-ui-installation-cmd.mdx",
        intro: "The Crossmint React SDK (`@crossmint/client-sdk-react-ui`) provides React components and hooks for integrating Crossmint checkout into your application. It supports both embedded checkout (inline iframe) and hosted checkout (popup/new-tab button).",
        exports: [
            "CrossmintProvider",
            "CrossmintCheckoutProvider",
            "useCrossmintCheckout",
            "useIdentityVerificationCredentials",
            "CrossmintEmbeddedCheckout",
            "CrossmintHostedCheckout",
            "CrossmintPaymentMethodManagement",
            "CrossmintProtectedInput",
            "CrossmintAgentCardAuthorization",
        ],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintCheckoutProvider: "Checkout order state management",
            CrossmintPaymentMethodManagement: "Saved payment method management UI",
            CrossmintProtectedInput: "Merchant-site password collection for Universal Checkout",
            CrossmintAgentCardAuthorization: "Card spend authorization (order intent) for Universal Checkout",
        },
        getStartedExamples: {
            setup: "checkoutProviderSetup",
            quickExample: "checkoutQuickExample",
            quickExampleIntro: "Once providers are set up, use the checkout components to accept payments:",
        },
    },
};

generate({
    products: PRODUCTS,
    ...parseCLIFlags(),
});
