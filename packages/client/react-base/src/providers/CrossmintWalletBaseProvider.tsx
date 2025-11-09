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
    emailSignerState: {
        needsAuth: boolean;
        sendEmailWithOtp: (() => Promise<void>) | null;
        verifyOtp: ((otp: string) => Promise<void>) | null;
        reject: ((error?: Error) => void) | null;
    };
};

export const CrossmintWalletBaseContext = createContext<CrossmintWalletBaseContext>({
    wallet: undefined,
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve(undefined),
    onAuthRequired: undefined,
    clientTEEConnection: undefined,
    emailSignerState: {
        needsAuth: false,
        sendEmailWithOtp: null,
        verifyOtp: null,
        reject: null,
    },
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
    const { crossmint } = useCrossmint("CrossmintWalletBaseProvider must be used within CrossmintProvider");
    const [wallet, setWallet] = useState<Wallet<Chain> | undefined>(undefined);
    const [walletStatus, setWalletStatus] = useState<"not-loaded" | "in-progress" | "loaded" | "error">("not-loaded");

    const [emailSignerState, setEmailSignerState] = useState({
        needsAuth: false,
        sendEmailWithOtp: null as (() => Promise<void>) | null,
        verifyOtp: null as ((otp: string) => Promise<void>) | null,
        reject: null as ((error?: Error) => void) | null,
    });

    const wrappedOnAuthRequired = useCallback(
        async (
            needsAuth: boolean,
            sendEmailWithOtp: () => Promise<void>,
            verifyOtp: (otp: string) => Promise<void>,
            reject: () => void
        ) => {
            setEmailSignerState({
                needsAuth,
                sendEmailWithOtp,
                verifyOtp,
                reject,
            });

            if (onAuthRequired) {
                return await onAuthRequired(needsAuth, sendEmailWithOtp, verifyOtp, reject);
            }
        },
        [onAuthRequired]
    );

    const getOrCreateWallet = useCallback(
        async <C extends Chain>(_args: WalletArgsFor<C>) => {
            const args = cloneDeep(_args);
            if (crossmint.jwt == null || walletStatus === "in-progress") {
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

                if (args?.signer?.type === "email") {
                    console.log("args.signer.type === email");
                    const email = args.signer.email;
                    console.log("email", email);
                    const _onAuthRequired = args.signer.onAuthRequired ?? wrappedOnAuthRequired;

                    if (email == null) {
                        throw new Error("Email not set in signer configuration.");
                    }
                    args.signer = {
                        ...args.signer,
                        email,
                        onAuthRequired: _onAuthRequired,
                    };
                    console.log("args.signer", args.signer);
                }

                if (args?.signer?.type === "phone") {
                    const phone = args.signer.phone;
                    const _onAuthRequired = args.signer.onAuthRequired ?? wrappedOnAuthRequired;

                    if (phone == null) {
                        throw new Error("Phone not found in signer configuration.");
                    }
                    args.signer = {
                        ...args.signer,
                        phone,
                        onAuthRequired: _onAuthRequired,
                    };
                }

                if (args?.signer?.type === "external-wallet") {
                    const signer = args.signer;

                    if (signer == null) {
                        throw new Error("External wallet address not found in signer configuration.");
                    }
                    args.signer = signer as SignerConfigForChain<C>;
                }

                if (args.signer.type === "email" || args.signer.type === "phone") {
                    await initializeWebView?.();
                }
                const wallet = await wallets.getOrCreateWallet<C>({
                    chain: args.chain,
                    signer: args.signer,
                    owner: args.owner,
                    plugins: args.plugins,
                    delegatedSigners: args.delegatedSigners,
                    alias: args.alias,
                    options: {
                        clientTEEConnection: clientTEEConnection?.(),
                        experimental_callbacks: {
                            onWalletCreationStart: _onWalletCreationStart ?? callbacks?.onWalletCreationStart,
                            onTransactionStart: _onTransactionStart ?? callbacks?.onTransactionStart,
                        },
                    },
                });
                console.log("wallet", wallet);
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
            wrappedOnAuthRequired,
            walletStatus,
            wallet,
            callbacks?.onWalletCreationStart,
            callbacks?.onTransactionStart,
            clientTEEConnection,
            initializeWebView,
        ]
    );

    useEffect(() => {
        console.log("createOnLogin", createOnLogin);
        if (createOnLogin != null && crossmint.jwt != null) {
            getOrCreateWallet(createOnLogin);
        }
    }, [createOnLogin, getOrCreateWallet, crossmint.jwt]);

    useEffect(() => {
        if (crossmint.jwt == null && walletStatus !== "not-loaded") {
            setWalletStatus("not-loaded");
            setWallet(undefined);
        }
    }, [crossmint.jwt, walletStatus]);

    const contextValue = useMemo(
        () => ({
            wallet,
            status: walletStatus,
            getOrCreateWallet,
            onAuthRequired: wrappedOnAuthRequired,
            clientTEEConnection,
            emailSignerState,
        }),
        [getOrCreateWallet, wallet, walletStatus, wrappedOnAuthRequired, clientTEEConnection, emailSignerState]
    );

    return <CrossmintWalletBaseContext.Provider value={contextValue}>{children}</CrossmintWalletBaseContext.Provider>;
}
