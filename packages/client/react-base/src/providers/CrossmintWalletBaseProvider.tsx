import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
    type Chain,
    CrossmintWallets,
    type EmailSignerConfig,
    type SignerConfigForChain,
    type Wallet,
    type WalletArgsFor,
    type WalletCreateArgs,
    type PhoneSignerConfig,
} from "@crossmint/wallets-sdk";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { useCrossmint } from "@/hooks";
import type { CreateOnLogin } from "@/types";

export type CrossmintWalletBaseContext = {
    wallet: Wallet<Chain> | undefined;
    status: "not-loaded" | "in-progress" | "loaded" | "error";
    getOrCreateWallet: <C extends Chain>(props: WalletCreateArgs<C>) => Promise<Wallet<Chain> | undefined>;
    getWallet: <C extends Chain>(
        props: Pick<WalletArgsFor<C>, "chain" | "signer">
    ) => Promise<Wallet<Chain> | undefined>;
    onAuthRequired?: EmailSignerConfig["onAuthRequired"] | PhoneSignerConfig["onAuthRequired"];
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
};

export const CrossmintWalletBaseContext = createContext<CrossmintWalletBaseContext>({
    wallet: undefined,
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve(undefined),
    getWallet: () => Promise.resolve(undefined),
    onAuthRequired: undefined,
    clientTEEConnection: undefined,
});

export interface CrossmintWalletBaseProviderProps {
    children: ReactNode;
    createOnLogin?: CreateOnLogin;
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
    onAuthRequired?: EmailSignerConfig["onAuthRequired"] | PhoneSignerConfig["onAuthRequired"];
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    initializeWebView?: () => Promise<void>;
}

export function CrossmintWalletBaseProvider({
    children,
    createOnLogin,
    callbacks,
    onAuthRequired,
    clientTEEConnection,
    initializeWebView,
}: CrossmintWalletBaseProviderProps) {
    const { crossmint, experimental_customAuth } = useCrossmint(
        "CrossmintWalletBaseProvider must be used within CrossmintProvider"
    );
    const [wallet, setWallet] = useState<Wallet<Chain> | undefined>(undefined);
    const [walletStatus, setWalletStatus] = useState<"not-loaded" | "in-progress" | "loaded" | "error">("not-loaded");

    const resolveSignerConfig = useCallback(
        <C extends Chain>(signer: SignerConfigForChain<C>): SignerConfigForChain<C> => {
            if (signer.type === "email") {
                const email = signer.email ?? experimental_customAuth?.email;
                const _onAuthRequired = signer.onAuthRequired ?? onAuthRequired;

                if (email == null) {
                    throw new Error(
                        "Email not found in experimental_customAuth or signer. Please set email in experimental_customAuth or signer."
                    );
                }
                return {
                    ...signer,
                    email,
                    onAuthRequired: _onAuthRequired,
                };
            }

            if (signer.type === "phone") {
                const phone = signer.phone ?? experimental_customAuth?.phone;
                const _onAuthRequired = signer.onAuthRequired ?? onAuthRequired;

                if (phone == null) {
                    throw new Error("Phone not found in signer. Please set phone in signer.");
                }
                return {
                    ...signer,
                    phone,
                    onAuthRequired: _onAuthRequired,
                };
            }

            if (signer.type === "external-wallet") {
                const resolvedSigner = signer.address != null ? signer : experimental_customAuth?.externalWalletSigner;

                if (resolvedSigner == null) {
                    throw new Error(
                        "External wallet config not found in experimental_customAuth or signer. Please set it in experimental_customAuth or signer."
                    );
                }
                return resolvedSigner as SignerConfigForChain<C>;
            }

            return signer as SignerConfigForChain<C>;
        },
        [experimental_customAuth, onAuthRequired]
    );

    const initializeWebViewIfNeeded = useCallback(
        async (signer: SignerConfigForChain<Chain>) => {
            if (signer.type === "email" || signer.type === "phone") {
                await initializeWebView?.();
            }
        },
        [initializeWebView]
    );

    const getOrCreateWallet = useCallback(
        async <C extends Chain>(args: WalletCreateArgs<C>) => {
            if (experimental_customAuth?.jwt == null || walletStatus === "in-progress") {
                return undefined;
            }
            if (wallet != null) {
                return wallet;
            }

            try {
                setWalletStatus("in-progress");
                const wallets = CrossmintWallets.from(crossmint);

                const _onWalletCreationStart = args.options?.experimental_callbacks?.onWalletCreationStart;
                const _onTransactionStart = args.options?.experimental_callbacks?.onTransactionStart;

                // Resolve signer configuration
                const resolvedSigner = resolveSignerConfig(args.signer) as SignerConfigForChain<C>;

                // Initialize WebView if needed
                await initializeWebViewIfNeeded(resolvedSigner);

                const wallet = await wallets.getOrCreateWallet<C>({
                    chain: args.chain,
                    signer: resolvedSigner,
                    owner: args.owner,
                    plugins: args.plugins,
                    onCreateConfig: args.onCreateConfig,
                    options: {
                        clientTEEConnection: clientTEEConnection?.(),
                        experimental_callbacks: {
                            onWalletCreationStart: _onWalletCreationStart ?? callbacks?.onWalletCreationStart,
                            onTransactionStart: _onTransactionStart ?? callbacks?.onTransactionStart,
                        },
                    },
                });
                setWallet(wallet);
                setWalletStatus("loaded");
                return wallet;
            } catch (error) {
                console.error("Failed to create wallet:", error);
                setWallet(undefined);
                setWalletStatus("error");
                return undefined;
            }
        },
        [
            crossmint,
            experimental_customAuth,
            walletStatus,
            wallet,
            resolveSignerConfig,
            initializeWebViewIfNeeded,
            clientTEEConnection,
            callbacks,
        ]
    );

    const getWallet = useCallback(
        async <C extends Chain>(args: Pick<WalletArgsFor<C>, "chain" | "signer">) => {
            if (experimental_customAuth?.jwt == null) {
                return undefined;
            }

            try {
                const wallets = CrossmintWallets.from(crossmint);

                const resolvedSigner = resolveSignerConfig(args.signer) as SignerConfigForChain<C>;

                await initializeWebViewIfNeeded(resolvedSigner);

                const chainType = args.chain === "solana" ? "solana" : args.chain === "stellar" ? "stellar" : "evm";
                const walletLocator = `me:${chainType}:smart`;
                const wallet = await wallets.getWallet<C>(walletLocator, {
                    chain: args.chain,
                    signer: resolvedSigner,
                    options: {
                        clientTEEConnection: clientTEEConnection?.(),
                        experimental_callbacks: callbacks,
                    },
                });
                return wallet;
            } catch (error) {
                console.error("Failed to get wallet:", error);
                return undefined;
            }
        },
        [
            crossmint,
            experimental_customAuth,
            resolveSignerConfig,
            initializeWebViewIfNeeded,
            clientTEEConnection,
            callbacks,
        ]
    );

    useEffect(() => {
        if (createOnLogin != null) {
            if (
                (createOnLogin.signer.type === "email" && experimental_customAuth?.email == null) ||
                (createOnLogin.signer.type === "external-wallet" &&
                    experimental_customAuth?.externalWalletSigner == null &&
                    createOnLogin.signer.address == null)
            ) {
                return;
            }

            getOrCreateWallet(createOnLogin);
        }
    }, [
        createOnLogin,
        getOrCreateWallet,
        experimental_customAuth?.email,
        experimental_customAuth?.externalWalletSigner,
    ]);

    useEffect(() => {
        if (experimental_customAuth?.jwt == null && walletStatus !== "not-loaded") {
            setWalletStatus("not-loaded");
            setWallet(undefined);
        }
    }, [experimental_customAuth?.jwt, walletStatus]);

    const contextValue = useMemo(
        () => ({
            wallet,
            status: walletStatus,
            getOrCreateWallet,
            getWallet,
            onAuthRequired,
            clientTEEConnection,
        }),
        [getOrCreateWallet, getWallet, wallet, walletStatus, onAuthRequired, clientTEEConnection]
    );

    return <CrossmintWalletBaseContext.Provider value={contextValue}>{children}</CrossmintWalletBaseContext.Provider>;
}
