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
import type { UIConfig } from "@crossmint/common-sdk-base";
import { useCrossmint, useSignerAuth } from "@/hooks";
import type { CreateOnLogin } from "@/types";
import cloneDeep from "lodash.clonedeep";
import { useLogger } from "./LoggerProvider";
import { LoggerContext } from "./CrossmintProvider";
import { CrossmintWalletUIBaseProvider, type UIRenderProps } from "./CrossmintWalletUIBaseProvider";

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
    // UI-related props (optional)
    appearance?: UIConfig;
    headlessSigningFlow?: boolean;
    showPasskeyHelpers?: boolean;
    renderUI?: (props: UIRenderProps) => ReactNode;
}

type ValidPasskeyPromptType =
    | "create-wallet"
    | "transaction"
    | "not-supported"
    | "create-wallet-error"
    | "transaction-error";

export type PasskeyPromptState = {
    open: boolean;
    type?: ValidPasskeyPromptType;
    primaryActionOnClick?: () => void;
    secondaryActionOnClick?: () => void;
};

export function CrossmintWalletBaseProvider({
    children,
    createOnLogin,
    callbacks,
    clientTEEConnection,
    initializeWebView,
    appearance,
    headlessSigningFlow,
    showPasskeyHelpers,
    renderUI,
}: CrossmintWalletBaseProviderProps) {
    const logger = useLogger(LoggerContext);
    const { crossmint, experimental_customAuth } = useCrossmint(
        "CrossmintWalletBaseProvider must be used within CrossmintProvider"
    );
    const [wallet, setWallet] = useState<Wallet<Chain> | undefined>(undefined);
    const [walletStatus, setWalletStatus] = useState<"not-loaded" | "in-progress" | "loaded" | "error">("not-loaded");
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });
    const signerAuth = useSignerAuth(wallet?.signer);
    const { onAuthRequired } = signerAuth;

    const [emailSignerState, setEmailSignerState] = useState({
        needsAuth: false,
        sendEmailWithOtp: null as (() => Promise<void>) | null,
        verifyOtp: null as ((otp: string) => Promise<void>) | null,
        reject: null as ((error?: Error) => void) | null,
    });

    const createPasskeyPrompt = useCallback(
        (type: ValidPasskeyPromptType) => () =>
            new Promise<void>((resolve) => {
                if (!showPasskeyHelpers) {
                    resolve();
                    return;
                }
                setPasskeyPromptState({
                    type,
                    open: true,
                    primaryActionOnClick: () => {
                        setPasskeyPromptState({ open: false });
                        resolve();
                    },
                    secondaryActionOnClick: () => {
                        setPasskeyPromptState({ open: false });
                        resolve();
                    },
                });
            }),
        [showPasskeyHelpers]
    );

    const updateCallbacks = useMemo(() => {
        let onWalletCreationStart = callbacks?.onWalletCreationStart;
        let onTransactionStart = callbacks?.onTransactionStart;

        if (createOnLogin?.signer.type === "passkey" && showPasskeyHelpers) {
            onWalletCreationStart = createPasskeyPrompt("create-wallet");
            onTransactionStart = createPasskeyPrompt("transaction");
        }

        return { onWalletCreationStart, onTransactionStart };
    }, [callbacks, createOnLogin?.signer.type, showPasskeyHelpers, createPasskeyPrompt]);

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
                logger.info("wrappedOnAuthRequired: onAuthRequired", { onAuthRequired });
                return await onAuthRequired(needsAuth, sendEmailWithOtp, verifyOtp, reject);
            }
        },
        [onAuthRequired]
    );

    const getOrCreateWallet = useCallback(
        async <C extends Chain>(_args: WalletArgsFor<C>) => {
            // Deep clone the args object to avoid mutating the original object
            const args = cloneDeep(_args);
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

                if (args?.signer?.type === "email") {
                    const email = args.signer.email ?? experimental_customAuth?.email;
                    logger.info("getOrCreateWallet: Email signer onAuthRequired", {
                        onAuthRequired: args.signer.onAuthRequired,
                    });
                    const _onAuthRequired = args.signer.onAuthRequired ?? wrappedOnAuthRequired;
                    logger.info("getOrCreateWallet: Email signer onAuthRequired wrapped", {
                        onAuthRequired: _onAuthRequired,
                    });

                    if (email == null) {
                        throw new Error(
                            "Email not found in experimental_customAuth or signer. Please set email in experimental_customAuth or signer."
                        );
                    }
                    args.signer = {
                        ...args.signer,
                        email,
                        onAuthRequired: _onAuthRequired,
                    };
                }

                if (args?.signer?.type === "phone") {
                    const phone = args.signer.phone ?? experimental_customAuth?.phone;
                    const _onAuthRequired = args.signer.onAuthRequired ?? wrappedOnAuthRequired;

                    if (phone == null) {
                        throw new Error("Phone not found in signer. Please set phone in signer.");
                    }
                    args.signer = {
                        ...args.signer,
                        phone,
                        onAuthRequired: _onAuthRequired,
                    };
                }

                if (args?.signer?.type === "external-wallet") {
                    const signer =
                        args.signer?.address != null ? args.signer : experimental_customAuth.externalWalletSigner;

                    if (signer == null) {
                        throw new Error(
                            "External wallet config not found in experimental_customAuth or signer. Please set it in experimental_customAuth or signer."
                        );
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
                            onWalletCreationStart: _onWalletCreationStart ?? updateCallbacks?.onWalletCreationStart,
                            onTransactionStart: _onTransactionStart ?? updateCallbacks?.onTransactionStart,
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
            wrappedOnAuthRequired,
            walletStatus,
            wallet,
            updateCallbacks?.onWalletCreationStart,
            updateCallbacks?.onTransactionStart,
            clientTEEConnection,
            initializeWebView,
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
            onAuthRequired: wrappedOnAuthRequired,
            clientTEEConnection,
            emailSignerState,
        }),
        [getOrCreateWallet, wallet, walletStatus, wrappedOnAuthRequired, clientTEEConnection, emailSignerState]
    );

    const hasUIProps =
        appearance != null || headlessSigningFlow != null || showPasskeyHelpers != null || renderUI != null;

    return (
        <CrossmintWalletBaseContext.Provider value={contextValue}>
            {hasUIProps ? (
                <CrossmintWalletUIBaseProvider
                    appearance={appearance}
                    createOnLogin={createOnLogin}
                    headlessSigningFlow={headlessSigningFlow}
                    renderUI={renderUI}
                    passkeyPromptState={passkeyPromptState}
                    signerAuth={signerAuth}
                >
                    {children}
                </CrossmintWalletUIBaseProvider>
            ) : (
                children
            )}
        </CrossmintWalletBaseContext.Provider>
    );
}
