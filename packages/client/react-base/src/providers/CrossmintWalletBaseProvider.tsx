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
    type DeviceSignerKeyStorage,
    WalletNotAvailableError,
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
    /** The current wallet instance, or undefined if no wallet is loaded. */
    wallet: Wallet<Chain> | undefined;
    /** Current wallet status. */
    status: "not-loaded" | "in-progress" | "loaded" | "error";
    /** Creates a new wallet or retrieves an existing one. */
    getOrCreateWallet: <C extends Chain>(props: WalletCreateArgs<C>) => Promise<Wallet<Chain> | undefined>;
    /** Retrieves an existing wallet. */
    getWallet: <C extends Chain>(
        props: Pick<WalletArgsFor<C>, "chain" | "signer">
    ) => Promise<Wallet<Chain> | undefined>;
    /** Callback invoked when email or phone verification is required during a non-custodial wallet signing flow. */
    onAuthRequired?: EmailSignerConfig["onAuthRequired"] | PhoneSignerConfig["onAuthRequired"];
    /** @internal */
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    /** @internal */
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
    getWallet: () => Promise.resolve(undefined),
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
    /** Configuration for automatic wallet creation on login. */
    createOnLogin?: CreateOnLogin;
    /**
     * @internal
     * Storage for the device signer key.
     */
    deviceSignerKeyStorage?: DeviceSignerKeyStorage;
    /** Lifecycle callbacks for wallet creation and transaction events. */
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
    /** Appearance configuration for wallet UI components. */
    appearance?: UIConfig;
    /** Whether to show passkey helper UI. Default: true. */
    showPasskeyHelpers?: boolean;
    /** When true, no UI is rendered and signing flows must be handled manually. When false, built-in UI components are rendered. */
    headlessSigningFlow?: boolean;
    /** Callback invoked when email or phone verification is required during a non-custodial wallet signing flow. */
    onAuthRequired?: EmailSignerConfig["onAuthRequired"] | PhoneSignerConfig["onAuthRequired"];
    /** @internal */
    children: ReactNode;
    /** @internal */
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    /** @internal */
    initializeWebView?: () => Promise<void>;
    /** @internal */
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
    deviceSignerKeyStorage,
    initializeWebView,
    appearance,
    headlessSigningFlow,
    showPasskeyHelpers,
    renderUI,
}: CrossmintWalletBaseProviderProps) {
    const logger = useLogger(LoggerContext);
    const { crossmint } = useCrossmint("CrossmintWalletBaseProvider must be used within CrossmintProvider");
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

        if (createOnLogin?.signer?.type === "passkey" && showPasskeyHelpers) {
            onWalletCreationStart = createPasskeyPrompt("create-wallet");
            onTransactionStart = createPasskeyPrompt("transaction");
        }

        return { onWalletCreationStart, onTransactionStart };
    }, [callbacks, createOnLogin?.signer?.type, showPasskeyHelpers, createPasskeyPrompt]);

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

    const resolveSignerConfig = useCallback(
        <C extends Chain>(signer: SignerConfigForChain<C>): SignerConfigForChain<C> => {
            if (signer.type === "email") {
                const _onAuthRequired = signer.onAuthRequired ?? wrappedOnAuthRequired;

                if (signer.email == null) {
                    throw new Error("Email not set in signer configuration.");
                }
                return {
                    ...signer,
                    onAuthRequired: _onAuthRequired,
                };
            }

            if (signer.type === "phone") {
                const _onAuthRequired = signer.onAuthRequired ?? wrappedOnAuthRequired;

                if (signer.phone == null) {
                    throw new Error("Phone not found in signer configuration.");
                }
                return {
                    ...signer,
                    onAuthRequired: _onAuthRequired,
                };
            }

            if (signer.type === "external-wallet") {
                if (signer.address == null) {
                    throw new Error("External wallet address not set in signer configuration.");
                }
                return signer;
            }

            return signer as SignerConfigForChain<C>;
        },
        [wrappedOnAuthRequired]
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
        async <C extends Chain>(_args: WalletCreateArgs<C>) => {
            // Deep clone the args object to avoid mutating the original object
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

                const resolvedSigner = args.signer
                    ? (resolveSignerConfig(args.signer) as SignerConfigForChain<C>)
                    : undefined;

                if (resolvedSigner != null) {
                    await initializeWebViewIfNeeded(resolvedSigner);
                }

                const walletOptions = {
                    clientTEEConnection: clientTEEConnection?.(),
                    experimental_callbacks: {
                        onWalletCreationStart: _onWalletCreationStart ?? updateCallbacks?.onWalletCreationStart,
                        onTransactionStart: _onTransactionStart ?? updateCallbacks?.onTransactionStart,
                        onChangeSigner: undefined as
                            | (<C2 extends Chain>(signerConfig: SignerConfigForChain<C2>) => Promise<void>)
                            | undefined,
                    },
                    deviceSignerKeyStorage,
                };

                // Try to get existing wallet first, then create if not found
                let wallet: Awaited<ReturnType<typeof wallets.getWallet<C>>> | undefined;
                try {
                    wallet = await wallets.getWallet<C>({
                        chain: args.chain,
                        signer: resolvedSigner,
                        alias: args.alias,
                        options: walletOptions,
                    });
                } catch (error) {
                    if (!(error instanceof WalletNotAvailableError)) {
                        throw error;
                    }
                    // Wallet doesn't exist yet, create it
                }

                if (wallet == null) {
                    wallet = await wallets.createWallet<C>({
                        chain: args.chain,
                        signer: resolvedSigner,
                        plugins: args.plugins,
                        recovery: args.recovery,
                        signers: args.signers,
                        alias: args.alias,
                        options: walletOptions,
                    });
                }

                // Set up the onChangeSigner callback now that wallet is available
                walletOptions.experimental_callbacks.onChangeSigner = async <C2 extends Chain>(
                    signerConfig: SignerConfigForChain<C2>
                ) => {
                    const resolvedSignerConfig = resolveSignerConfig(signerConfig);
                    const assembledSigner = await wallets.assembleSigner(args, resolvedSignerConfig, {
                        deviceSignerKeyStorage,
                    });
                    if (assembledSigner != null) {
                        wallet.signer = assembledSigner;
                    }
                };
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
            crossmint.jwt,
            walletStatus,
            wallet,
            resolveSignerConfig,
            initializeWebViewIfNeeded,
            updateCallbacks?.onWalletCreationStart,
            updateCallbacks?.onTransactionStart,
            clientTEEConnection,
            callbacks,
            deviceSignerKeyStorage,
        ]
    );

    const getWallet = useCallback(
        async <C extends Chain>(args: Pick<WalletArgsFor<C>, "chain" | "signer">) => {
            if (crossmint.jwt == null) {
                return undefined;
            }

            try {
                const wallets = CrossmintWallets.from(crossmint);

                const resolvedSigner = args.signer
                    ? (resolveSignerConfig(args.signer) as SignerConfigForChain<C>)
                    : undefined;

                if (resolvedSigner != null) {
                    await initializeWebViewIfNeeded(resolvedSigner);
                }

                const wallet = await wallets.getWallet<C>({
                    chain: args.chain,
                    signer: resolvedSigner,
                    options: {
                        clientTEEConnection: clientTEEConnection?.(),
                        experimental_callbacks: callbacks,
                        deviceSignerKeyStorage: deviceSignerKeyStorage,
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
            resolveSignerConfig,
            initializeWebViewIfNeeded,
            clientTEEConnection,
            callbacks,
            deviceSignerKeyStorage,
        ]
    );

    useEffect(() => {
        if (createOnLogin != null) {
            // Guard: don't attempt wallet creation if required signer fields are missing.
            // For email signers, email must be explicitly set (populated by CrossmintWalletProvider from auth context).
            // For external-wallet signers, address must be explicitly set.
            const signer = createOnLogin.signer;
            if (signer?.type === "email" && signer.email == null) {
                return;
            }
            if (signer?.type === "external-wallet" && signer.address == null) {
                return;
            }
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
            getWallet,
            onAuthRequired: wrappedOnAuthRequired,
            clientTEEConnection,
            emailSignerState,
        }),
        [
            getOrCreateWallet,
            getWallet,
            wallet,
            walletStatus,
            wrappedOnAuthRequired,
            clientTEEConnection,
            emailSignerState,
        ]
    );

    const hasUIProps =
        appearance != null || headlessSigningFlow != null || showPasskeyHelpers != null || renderUI != null;

    return (
        <CrossmintWalletBaseContext.Provider value={contextValue}>
            {hasUIProps ? (
                <CrossmintWalletUIBaseProvider
                    appearance={appearance}
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
