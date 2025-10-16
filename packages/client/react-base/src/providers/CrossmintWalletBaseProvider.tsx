import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
    type Chain,
    CrossmintWallets,
    type EmailSignerConfig,
    type SignerConfigForChain,
    type Wallet,
    type WalletArgsFor,
    type PhoneSignerConfig,
} from "@crossmint/wallets-sdk";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { useCrossmint } from "@/hooks";
import type { CreateOnLogin } from "@/types";
import cloneDeep from "lodash.clonedeep";

export type CrossmintWalletBaseContext = {
    wallet: Wallet<Chain> | undefined;
    status: "not-loaded" | "in-progress" | "loaded" | "error";
    getOrCreateWallet: <C extends Chain>(props: WalletArgsFor<C>) => Promise<Wallet<Chain> | undefined>;
    onAuthRequired?: EmailSignerConfig["onAuthRequired"] | PhoneSignerConfig["onAuthRequired"];
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
};

export const CrossmintWalletBaseContext = createContext<CrossmintWalletBaseContext>({
    wallet: undefined,
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve(undefined),
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

    const getOrCreateWallet = useCallback(
        async <C extends Chain>(args: WalletArgsFor<C>) => {
            // Deep clone the args object to avoid mutating the original object
            const argsCopy = cloneDeep(args);
            if (experimental_customAuth?.jwt == null || walletStatus === "in-progress") {
                return undefined;
            }
            if (wallet != null) {
                return wallet;
            }

            try {
                setWalletStatus("in-progress");
                const wallets = CrossmintWallets.from(crossmint);

                const _onWalletCreationStart = argsCopy.options?.experimental_callbacks?.onWalletCreationStart;
                const _onTransactionStart = argsCopy.options?.experimental_callbacks?.onTransactionStart;

                if (argsCopy?.signer?.type === "email") {
                    const email = argsCopy.signer.email ?? experimental_customAuth?.email;
                    const _onAuthRequired = argsCopy.signer.onAuthRequired ?? onAuthRequired;

                    if (email == null) {
                        throw new Error(
                            "Email not found in experimental_customAuth or signer. Please set email in experimental_customAuth or signer."
                        );
                    }
                    argsCopy.signer = {
                        ...argsCopy.signer,
                        email,
                        onAuthRequired: _onAuthRequired,
                    };
                }

                if (argsCopy?.signer?.type === "phone") {
                    const phone = argsCopy.signer.phone ?? experimental_customAuth?.phone;
                    const _onAuthRequired = argsCopy.signer.onAuthRequired ?? onAuthRequired;

                    if (phone == null) {
                        throw new Error("Phone not found in signer. Please set phone in signer.");
                    }
                    argsCopy.signer = {
                        ...argsCopy.signer,
                        phone,
                        onAuthRequired: _onAuthRequired,
                    };
                }

                if (argsCopy?.signer?.type === "external-wallet") {
                    const signer =
                        argsCopy.signer?.address != null
                            ? argsCopy.signer
                            : experimental_customAuth.externalWalletSigner;

                    if (signer == null) {
                        throw new Error(
                            "External wallet config not found in experimental_customAuth or signer. Please set it in experimental_customAuth or signer."
                        );
                    }
                    argsCopy.signer = signer as SignerConfigForChain<C>;
                }

                if (argsCopy.signer.type === "email" || argsCopy.signer.type === "phone") {
                    await initializeWebView?.();
                }
                const wallet = await wallets.getOrCreateWallet<C>({
                    chain: argsCopy.chain,
                    signer: argsCopy.signer,
                    owner: argsCopy.owner,
                    plugins: argsCopy.plugins,
                    delegatedSigners: argsCopy.delegatedSigners,
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
        [crossmint, experimental_customAuth]
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
            onAuthRequired,
            clientTEEConnection,
        }),
        [getOrCreateWallet, wallet, walletStatus, onAuthRequired, clientTEEConnection]
    );

    return <CrossmintWalletBaseContext.Provider value={contextValue}>{children}</CrossmintWalletBaseContext.Provider>;
}
