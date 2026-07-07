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
        installSnippet: "client-sdk-react-native-ui-installation-cmd.mdx",
        intro: "The Crossmint React Native SDK (`@crossmint/client-sdk-react-native-ui`) provides React Native components and hooks for integrating Crossmint wallets into your mobile application.",
        versionBanner: `<Note>
**This page has been updated for Wallets SDK V1.** If you are using the previous version,
see the [previous version of this page](/sdk-reference/wallets/v0/react-native/{page}) or the [V1 migration guide](/wallets/guides/migrate-to-v1).
</Note>`,
        exports: [
            "CrossmintProvider",
            "CrossmintWalletProvider",
            "useWallet",
            "useWalletOtpSigner",
            "ExportPrivateKeyButton",
        ],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintWalletProvider: "Wallet creation and management",
        },
        walletMethods: {
            enabled: true,
            description:
                "The `wallet` instance returned by `useWallet()` provides methods for token transfers, balances, signing, and more.\n\nSince the React Native SDK wraps the Wallets SDK, see the **[Wallets SDK Reference](/sdk-reference/wallets/typescript/classes/Wallet)** for complete documentation.",
            baseClass: "Wallet",
            chainClasses: ["EVMWallet", "SolanaWallet", "StellarWallet"],
            docsBasePath: "/sdk-reference/wallets/typescript/classes",
            skip: ["approve", "approveTransaction", "from"],
        },
        getStartedExamples: {
            setup: "rnWalletProviderSetup",
            quickExample: "rnWalletQuickExample",
            quickExampleIntro: "Once providers are set up, use hooks to access wallet state:",
        },
    },
    auth: {
        outdir: "auth",
        navPrefix: "sdk-reference/auth/react-native",
        title: "React Native SDK",
        description: "React Native SDK reference for Crossmint authentication",
        packageName: "@crossmint/client-sdk-react-native-ui",
        npmUrl: "https://www.npmjs.com/package/@crossmint/client-sdk-react-native-ui",
        installSnippet: "client-sdk-react-native-ui-installation-cmd.mdx",
        intro: "The Crossmint React Native SDK (`@crossmint/client-sdk-react-native-ui`) provides React Native providers and hooks for integrating Crossmint authentication into your mobile application, including email OTP, social login (OAuth), and session management.",
        exports: ["CrossmintProvider", "CrossmintAuthProvider", "useCrossmintAuth"],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintAuthProvider: "Authentication state, login/logout, and the auth flow",
        },
        getStartedExamples: {
            setup: "rnAuthProviderSetup",
            quickExample: "rnAuthQuickExample",
            quickExampleIntro: "Once providers are set up, use the `useCrossmintAuth` hook to access auth state:",
        },
    },
    checkout: {
        outdir: "checkout",
        navPrefix: "sdk-reference/checkout/react-native",
        title: "React Native SDK",
        description: "React Native SDK reference for Crossmint checkout",
        packageName: "@crossmint/client-sdk-react-native-ui",
        npmUrl: "https://www.npmjs.com/package/@crossmint/client-sdk-react-native-ui",
        installSnippet: "client-sdk-react-native-ui-installation-cmd.mdx",
        intro: "The Crossmint React Native SDK (`@crossmint/client-sdk-react-native-ui`) provides React Native components and hooks for integrating Crossmint checkout into your mobile application. It supports embedded checkout via a WebView.",
        exports: [
            "CrossmintProvider",
            "CrossmintCheckoutProvider",
            "useCrossmintCheckout",
            "CrossmintEmbeddedCheckout",
        ],
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintCheckoutProvider: "Checkout order state management",
        },
        getStartedExamples: {
            setup: "rnCheckoutProviderSetup",
            quickExample: "rnCheckoutQuickExample",
            quickExampleIntro: "Once providers are set up, use the checkout components to accept payments:",
        },
    },
};

generate({
    products: PRODUCTS,
    ...parseCLIFlags(),
});
