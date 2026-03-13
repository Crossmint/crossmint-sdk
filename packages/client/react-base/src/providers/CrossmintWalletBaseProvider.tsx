import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
    type Chain,
    CrossmintWallets,
    type Callbacks,
    type ClientSideWalletCreateArgs,
    type SignerConfigForChain,
    type Wallet,
    type ClientSideWalletArgsFor,
    type WalletCreateArgs,
    type DeviceSignerKeyStorage,
    type WalletOptions,
    WalletNotAvailableError,
    DeviceSignerDescriptor,
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
    /** Retrieves an existing wallet. */
    getWallet: <C extends Chain>(
        props: Pick<ClientSideWalletArgsFor<C>, "chain" | "alias">
    ) => Promise<Wallet<Chain> | undefined>;
    /** Creates a new wallet. */
    createWallet: <C extends Chain>(props: ClientSideWalletCreateArgs<C>) => Promise<Wallet<Chain> | undefined>;
    /** @internal */
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    /** @internal */
    emailSignerState: {
        needsAuth: boolean;
        sendEmailWithOtp: (() => Promise<void>) | null;
        verifyOtp: ((otp: string) => Promise<void>) | null;
        reject: ((error?: Error) => void) | null;
    };
    createDeviceSigner: () => Promise<DeviceSignerDescriptor> | undefined;
};

export const CrossmintWalletBaseContext = createContext<CrossmintWalletBaseContext>({
    wallet: undefined,
    status: "not-loaded",
    getWallet: () => Promise.resolve(undefined),
    createWallet: () => Promise.resolve(undefined),
    clientTEEConnection: undefined,
    emailSignerState: {
        needsAuth: false,
        sendEmailWithOtp: null,
        verifyOtp: null,
        reject: null,
    },
    createDeviceSigner: () => Promise.resolve(undefined),
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
    onAuthRequired?: Callbacks["onAuthRequired"];
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
    onAuthRequired: onAuthRequiredFromProps,
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
    const signerAuth = useSignerAuth();
    const { onAuthRequired: signerOnAuthRequired } = signerAuth;

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

        if (createOnLogin?.recovery?.type === "passkey" && showPasskeyHelpers) {
            onWalletCreationStart = createPasskeyPrompt("create-wallet");
            onTransactionStart = createPasskeyPrompt("transaction");
        }

        return { onWalletCreationStart, onTransactionStart };
    }, [callbacks, createOnLogin?.recovery?.type, showPasskeyHelpers, createPasskeyPrompt]);

    const wrappedOnAuthRequired = useCallback(
        async (
            signerType: "email" | "phone",
            signerLocator: string,
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
            const onAuthRequired = onAuthRequiredFromProps ?? signerOnAuthRequired;
            return await onAuthRequired?.(signerType, signerLocator, needsAuth, sendEmailWithOtp, verifyOtp, reject);
        },
        [onAuthRequiredFromProps, signerOnAuthRequired]
    );

    const resolveSignerConfig = useCallback(
        <C extends Chain>(signer: SignerConfigForChain<C>): SignerConfigForChain<C> => {
            if (signer.type === "email") {
                const email = signer.email ?? experimental_customAuth?.email;

                if (email == null) {
                    throw new Error(
                        "Email not found in experimental_customAuth or signer. Please set email in experimental_customAuth or signer."
                    );
                }
                return {
                    ...signer,
                    email,
                };
            }

            if (signer.type === "phone") {
                const phone = signer.phone ?? experimental_customAuth?.phone;

                if (phone == null) {
                    throw new Error("Phone not found in signer. Please set phone in signer.");
                }
                return {
                    ...signer,
                    phone,
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
        [experimental_customAuth]
    );

    const initializeWebViewIfNeeded = useCallback(
        async (signer: SignerConfigForChain<Chain>) => {
            if (signer.type === "email" || signer.type === "phone") {
                await initializeWebView?.();
            }
        },
        [initializeWebView]
    );

    const buildWalletOptions = useCallback(
        (argsOptions?: WalletOptions): WalletOptions => {
            return {
                clientTEEConnection: clientTEEConnection?.(),
                experimental_callbacks: {
                    onWalletCreationStart:
                        argsOptions?.experimental_callbacks?.onWalletCreationStart ??
                        updateCallbacks?.onWalletCreationStart,
                    onTransactionStart:
                        argsOptions?.experimental_callbacks?.onTransactionStart ?? updateCallbacks?.onTransactionStart,
                    onAuthRequired: argsOptions?.experimental_callbacks?.onAuthRequired ?? wrappedOnAuthRequired,
                },
                deviceSignerKeyStorage,
            };
        },
        [clientTEEConnection, updateCallbacks, deviceSignerKeyStorage, wrappedOnAuthRequired]
    );

    const getOrCreateWallet = useCallback(
        async <C extends Chain>(_args: WalletCreateArgs<C>) => {
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

                const resolvedRecovery = resolveSignerConfig(args.recovery) as WalletCreateArgs<C>["recovery"];
                await initializeWebViewIfNeeded(resolvedRecovery);

                const walletOptions = buildWalletOptions(args.options);

                // Try to get existing wallet first, then create if not found
                let wallet: Awaited<ReturnType<typeof wallets.getWallet<C>>> | undefined;
                try {
                    wallet = await wallets.getWallet<C>({
                        chain: args.chain,
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
                        plugins: args.plugins,
                        recovery: resolvedRecovery,
                        signers: args.signers,
                        alias: args.alias,
                        options: walletOptions,
                    });
                }

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
            buildWalletOptions,
        ]
    );

    const getWallet = useCallback(
        async <C extends Chain>(args: Pick<ClientSideWalletArgsFor<C>, "chain" | "alias">) => {
            if (experimental_customAuth?.jwt == null) {
                return undefined;
            }

            try {
                setWalletStatus("in-progress");
                const wallets = CrossmintWallets.from(crossmint);

                const wallet = await wallets.getWallet<C>({
                    chain: args.chain,
                    alias: args.alias,
                    options: buildWalletOptions(),
                });
                if (wallet != null) {
                    const resolvedRecovery = resolveSignerConfig(wallet.recovery) as WalletCreateArgs<C>["recovery"];
                    await initializeWebViewIfNeeded(resolvedRecovery);
                    setWallet(wallet);
                    setWalletStatus("loaded");
                } else {
                    setWalletStatus("not-loaded");
                }
                return wallet;
            } catch (error) {
                console.error("Failed to get wallet:", error);
                setWalletStatus("error");
                return undefined;
            }
        },
        [crossmint, experimental_customAuth, resolveSignerConfig, initializeWebViewIfNeeded, buildWalletOptions]
    );

    const createWallet = useCallback(
        async <C extends Chain>(args: ClientSideWalletCreateArgs<C>) => {
            if (experimental_customAuth?.jwt == null || walletStatus === "in-progress") {
                return undefined;
            }

            try {
                setWalletStatus("in-progress");
                const wallets = CrossmintWallets.from(crossmint);

                const resolvedRecovery = resolveSignerConfig(args.recovery) as WalletCreateArgs<C>["recovery"];
                await initializeWebViewIfNeeded(resolvedRecovery);

                const wallet = await wallets.createWallet<C>({
                    ...args,
                    recovery: resolvedRecovery,
                    options: buildWalletOptions(args.options),
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
            resolveSignerConfig,
            initializeWebViewIfNeeded,
            buildWalletOptions,
        ]
    );

    const createDeviceSigner = useCallback(() => {
        const wallets = CrossmintWallets.from(crossmint);
        if (!deviceSignerKeyStorage) {
            throw new Error("A DeviceSignerKeyStorage must be provided to create a device signer");
        }
        return wallets.createDeviceSigner(deviceSignerKeyStorage);
    }, [crossmint, deviceSignerKeyStorage]);

    useEffect(() => {
        if (createOnLogin != null) {
            const recovery = createOnLogin.recovery;
            if (
                (recovery?.type === "email" && experimental_customAuth?.email == null) ||
                (recovery?.type === "external-wallet" &&
                    experimental_customAuth?.externalWalletSigner == null &&
                    recovery.address == null)
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
            getWallet,
            createWallet,
            clientTEEConnection,
            emailSignerState,
            createDeviceSigner,
        }),
        [getWallet, createWallet, wallet, walletStatus, clientTEEConnection, emailSignerState, createDeviceSigner]
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
