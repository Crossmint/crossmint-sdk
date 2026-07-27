import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
    type RegisterSignerPasskeyParams,
    WalletNotAvailableError,
    type DeviceSignerConfig,
} from "@crossmint/wallets-sdk";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { ApiClientError, type UIConfig } from "@crossmint/common-sdk-base";
import { useCrossmint, useSignerAuth } from "@/hooks";
import type { CreateOnLogin } from "@/types";
import cloneDeep from "lodash.clonedeep";
import { useLogger } from "./LoggerProvider";
import { LoggerContext } from "./CrossmintProvider";
import { CrossmintWalletUIBaseProvider, type UIRenderProps } from "./CrossmintWalletUIBaseProvider";
import { CrossmintAuthBaseContext } from "./CrossmintAuthBaseProvider";

/**
 * Structured detail about the last wallet load/creation failure, exposed alongside `status`
 * so integrators can render an actionable message and decide whether to retry.
 * - `region-blocked`: request was blocked (e.g. Cloudflare 403 from a restricted region). Permanent — do not retry.
 * - `network`: transient failure (fetch reject/timeout, 5xx, or 429). Retryable.
 * - `unknown`: anything else.
 */
export type WalletContextError = {
    code: "region-blocked" | "network" | "unknown";
    status?: number;
    message: string;
};

export type CrossmintWalletBaseContext = {
    /** The current wallet instance, or undefined if no wallet is loaded. */
    wallet: Wallet<Chain> | undefined;
    /** Current wallet status. */
    status: "not-loaded" | "in-progress" | "loaded" | "error";
    /** Detail about the last failure, or null when there is no error. */
    error: WalletContextError | null;
    /** Retrieves an existing wallet. */
    getWallet: <C extends Chain>(
        props: Pick<ClientSideWalletArgsFor<C>, "chain" | "alias">
    ) => Promise<Wallet<Chain> | undefined>;
    /** Creates a new wallet. */
    createWallet: <C extends Chain>(props: ClientSideWalletCreateArgs<C>) => Promise<Wallet<Chain> | undefined>;
    /** @internal */
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    /** @internal */
    otpSignerState: {
        needsAuth: boolean;
        sendOtp: (() => Promise<void>) | null;
        verifyOtp: ((otp: string) => Promise<void>) | null;
        reject: ((error?: Error) => void) | null;
    };
    /** Creates a Device Signer */
    createDeviceSigner: (address?: string) => Promise<DeviceSignerConfig> | undefined;
    /** Creates a Passkey Signer */
    createPasskeySigner: (passkeyName: string) => Promise<RegisterSignerPasskeyParams>;
};

export const CrossmintWalletBaseContext = createContext<CrossmintWalletBaseContext>({
    wallet: undefined,
    status: "not-loaded",
    error: null,
    getWallet: () => Promise.resolve(undefined),
    createWallet: () => Promise.resolve(undefined),
    clientTEEConnection: undefined,
    otpSignerState: {
        needsAuth: false,
        sendOtp: null,
        verifyOtp: null,
        reject: null,
    },
    createDeviceSigner: () =>
        Promise.reject(new Error("createDeviceSigner must be used within a CrossmintWalletBaseProvider")),
    createPasskeySigner: () =>
        Promise.reject(new Error("createPasskeySigner must be used within a CrossmintWalletBaseProvider")),
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
    /** When true, built-in OTP signer UI prompts are shown during signing flows. When false, signing flows must be handled manually via the useWalletOtpSigner hook. Default: true. */
    showOtpSignerPrompt?: boolean;
    /** Callback invoked when email or phone verification is required during a non-custodial wallet signing flow. */
    onAuthRequired?: Callbacks["onAuthRequired"];
    /** @internal */
    children: ReactNode;
    /** @internal */
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    /** @internal */
    resetSignerFrame?: () => Promise<void>;
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

/**
 * Cloudflare serves an HTTP 403 with an HTML body when it bans the requester's country/region.
 * Its error code 1009 ("Access denied: ... has banned the country or region your IP address is
 * in") is the distinguishing signal — it lets us treat a genuine geo-block as permanent without
 * also labelling every other non-JSON 403 (nginx access controls, a CDN/reverse-proxy rule) as
 * `region-blocked` and permanently suppressing the auto-retry loop.
 */
const CLOUDFLARE_REGION_BLOCK_PATTERN = /error\s*1009|banned\s+(?:the\s+)?(?:country|region)/i;

export function isCloudflareRegionBlock(responseBody: string | null): boolean {
    return responseBody != null && CLOUDFLARE_REGION_BLOCK_PATTERN.test(responseBody);
}

/**
 * Maps a thrown wallet load/creation error to the structured shape exposed on the context.
 * A Cloudflare region-ban 403 is treated as a permanent block; fetch rejects/timeouts, 5xx, and
 * 429 are treated as transient network failures; everything else (incl. other 403s) is unknown.
 */
export function mapWalletError(error: unknown): WalletContextError {
    if (error instanceof ApiClientError) {
        if (error.status === 403 && isCloudflareRegionBlock(error.responseBody)) {
            return { code: "region-blocked", status: error.status, message: error.message };
        }
        if (error.status >= 500 || error.status === 429) {
            return { code: "network", status: error.status, message: error.message };
        }
        return { code: "unknown", status: error.status, message: error.message };
    }
    // A rejected fetch (no response) surfaces as a TypeError; treat as transient network failure.
    if (error instanceof TypeError) {
        return { code: "network", message: error.message };
    }
    return { code: "unknown", message: error instanceof Error ? error.message : String(error) };
}

export function CrossmintWalletBaseProvider({
    children,
    createOnLogin,
    callbacks,
    clientTEEConnection,
    resetSignerFrame,
    deviceSignerKeyStorage,
    initializeWebView,
    appearance,
    showOtpSignerPrompt,
    onAuthRequired: onAuthRequiredFromProps,
    showPasskeyHelpers,
    renderUI,
}: CrossmintWalletBaseProviderProps) {
    const logger = useLogger(LoggerContext);
    const { crossmint } = useCrossmint("CrossmintWalletBaseProvider must be used within CrossmintProvider");
    const [wallet, setWallet] = useState<Wallet<Chain> | undefined>(undefined);
    const [walletStatus, setWalletStatus] = useState<"not-loaded" | "in-progress" | "loaded" | "error">("not-loaded");
    const [walletError, setWalletError] = useState<WalletContextError | null>(null);
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });
    const signerAuth = useSignerAuth();
    const { onAuthRequired: signerOnAuthRequired } = signerAuth;

    const [otpSignerState, setOtpSignerState] = useState({
        needsAuth: false,
        sendOtp: null as (() => Promise<void>) | null,
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
            signerType: "email" | "phone" | "whatsapp",
            signerLocator: string,
            needsAuth: boolean,
            sendOtp: () => Promise<void>,
            verifyOtp: (otp: string) => Promise<void>,
            reject: () => void
        ) => {
            setOtpSignerState({
                needsAuth,
                sendOtp: sendOtp,
                verifyOtp,
                reject,
            });
            const onAuthRequired = onAuthRequiredFromProps ?? signerOnAuthRequired;
            return await onAuthRequired?.(signerType, signerLocator, needsAuth, sendOtp, verifyOtp, reject);
        },
        [onAuthRequiredFromProps, signerOnAuthRequired]
    );

    const initializeWebViewIfNeeded = useCallback(
        async (signer: SignerConfigForChain<Chain>) => {
            if (signer.type === "email" || signer.type === "phone" || signer.type === "whatsapp") {
                await initializeWebView?.();
            }
        },
        [initializeWebView]
    );

    const buildWalletOptions = useCallback(
        (argsOptions?: WalletOptions): WalletOptions => {
            return {
                clientTEEConnection: clientTEEConnection?.(),
                resetSignerFrame,
                callbacks: {
                    onWalletCreationStart:
                        argsOptions?.callbacks?.onWalletCreationStart ?? updateCallbacks?.onWalletCreationStart,
                    onTransactionStart:
                        argsOptions?.callbacks?.onTransactionStart ?? updateCallbacks?.onTransactionStart,
                    onAuthRequired: argsOptions?.callbacks?.onAuthRequired ?? wrappedOnAuthRequired,
                },
                deviceSignerKeyStorage,
            };
        },
        [clientTEEConnection, resetSignerFrame, updateCallbacks, deviceSignerKeyStorage, wrappedOnAuthRequired]
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
            if (walletError?.code === "region-blocked") {
                return undefined;
            }

            try {
                setWalletStatus("in-progress");
                setWalletError(null);
                const wallets = CrossmintWallets.from(crossmint);

                await initializeWebViewIfNeeded(args.recovery);

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
                        recovery: args.recovery,
                        signers: args.signers,
                        alias: args.alias,
                        options: walletOptions,
                    });
                }

                setWallet(wallet);
                setWalletStatus("loaded");
                return wallet;
            } catch (error) {
                logger.error("react.wallet.getOrCreateWallet.error", { error });
                setWallet(undefined);
                setWalletError(mapWalletError(error));
                setWalletStatus("error");
                return undefined;
            }
        },
        [crossmint, crossmint.jwt, walletStatus, wallet, walletError, initializeWebViewIfNeeded, buildWalletOptions]
    );

    const getWallet = useCallback(
        async <C extends Chain>(args: Pick<ClientSideWalletArgsFor<C>, "chain" | "alias">) => {
            if (crossmint?.jwt == null) {
                return undefined;
            }

            try {
                setWalletStatus("in-progress");
                setWalletError(null);
                const wallets = CrossmintWallets.from(crossmint);

                // Initialize WebView before building options. Unlike getOrCreateWallet/createWallet,
                // getWallet doesn't know the recovery type upfront, so we initialize unconditionally.
                // On web this is a no-op (initializeWebView is undefined). On React Native, this
                // ensures the TEE connection is available for email/phone signer wallets.
                await initializeWebView?.();

                const wallet = await wallets.getWallet<C>({
                    chain: args.chain,
                    alias: args.alias,
                    options: buildWalletOptions(),
                });
                if (wallet != null) {
                    setWallet(wallet);
                    setWalletStatus("loaded");
                } else {
                    setWalletStatus("not-loaded");
                }
                return wallet;
            } catch (error) {
                logger.error("react.wallet.getWallet.error", { error });
                setWalletError(mapWalletError(error));
                setWalletStatus("error");
                return undefined;
            }
        },
        [crossmint, initializeWebView, buildWalletOptions]
    );

    const createWallet = useCallback(
        async <C extends Chain>(args: ClientSideWalletCreateArgs<C>) => {
            if (crossmint.jwt == null || walletStatus === "in-progress") {
                return undefined;
            }

            try {
                setWalletStatus("in-progress");
                setWalletError(null);
                const wallets = CrossmintWallets.from(crossmint);

                await initializeWebViewIfNeeded(args.recovery);

                const wallet = await wallets.createWallet<C>({
                    ...args,
                    options: buildWalletOptions(args.options),
                });
                setWallet(wallet);
                setWalletStatus("loaded");
                return wallet;
            } catch (error) {
                logger.error("react.wallet.createWallet.error", { error });
                setWallet(undefined);
                setWalletError(mapWalletError(error));
                setWalletStatus("error");
                return undefined;
            }
        },
        [crossmint, walletStatus, initializeWebViewIfNeeded, buildWalletOptions]
    );

    const createDeviceSigner = useCallback(
        (address?: string) => {
            const wallets = CrossmintWallets.from(crossmint);
            if (deviceSignerKeyStorage == null) {
                throw new Error("A DeviceSignerKeyStorage must be provided to create a device signer");
            }
            return wallets.createDeviceSigner(deviceSignerKeyStorage, address);
        },
        [crossmint, deviceSignerKeyStorage]
    );

    const createPasskeySigner = useCallback(
        async (passkeyName: string) => {
            const wallets = CrossmintWallets.from(crossmint);
            return await wallets.createPasskeySigner(passkeyName);
        },
        [crossmint]
    );

    // When using createOnLogin with an email signer, automatically populate the email from the auth context.
    // This allows both react-ui and react-native to share this logic via the base auth context.
    const authBaseContext = useContext(CrossmintAuthBaseContext);
    const [processedCreateOnLogin, setProcessedCreateOnLogin] = useState<CreateOnLogin | undefined>(undefined);
    useEffect(() => {
        if (createOnLogin == null) {
            setProcessedCreateOnLogin(undefined);
            return;
        }

        // Check if any email signer (in recovery or signers array) is missing its email value
        const hasEmailSignerNeedingPopulation =
            (createOnLogin.recovery?.type === "email" && createOnLogin.recovery.email == null) ||
            (createOnLogin.signers?.some((s) => s.type === "email" && s.email == null) ?? false);

        if (hasEmailSignerNeedingPopulation) {
            // For email signers using createOnLogin, we must populate signer.email from the auth context.
            // If the user is not yet available, wait for the auth context to update.
            if (authBaseContext?.user == null) {
                return;
            }
            if (authBaseContext.user.email == null) {
                // Trigger a user fetch; when authBaseContext.user.email updates,
                // this effect will re-run via the dependency array.
                authBaseContext.getUser();
                return;
            }

            const userEmail = authBaseContext.user.email;
            const processed = { ...createOnLogin };

            // Populate email on recovery signer if needed
            if (processed.recovery?.type === "email" && processed.recovery.email == null) {
                processed.recovery = { ...processed.recovery, email: userEmail };
            }

            // Populate email on each signer in the signers array if needed
            if (processed.signers != null) {
                processed.signers = processed.signers.map((s) => {
                    if (s.type === "email" && s.email == null) {
                        return { ...s, email: userEmail };
                    }
                    return s;
                }) as typeof processed.signers;
            }

            setProcessedCreateOnLogin(processed as CreateOnLogin);
            return;
        }

        // For other signer types (passkey, phone with explicit phone, external-wallet with explicit address, etc.), pass through as-is
        setProcessedCreateOnLogin(createOnLogin);
    }, [createOnLogin, authBaseContext?.user, authBaseContext?.user?.email]);

    useEffect(() => {
        if (processedCreateOnLogin != null) {
            // Guard: don't attempt wallet creation if required signer fields are still missing.
            const { recovery, signers } = processedCreateOnLogin;
            if (recovery?.type === "external-wallet" && recovery.address == null) {
                return;
            }
            if (signers?.some((s) => s.type === "external-wallet" && s.address == null)) {
                return;
            }
            getOrCreateWallet(processedCreateOnLogin);
        }
    }, [processedCreateOnLogin, getOrCreateWallet, crossmint.jwt]);

    useEffect(() => {
        if (crossmint.jwt == null && walletStatus !== "not-loaded") {
            setWalletStatus("not-loaded");
            setWallet(undefined);
            setWalletError(null);
        }
    }, [crossmint.jwt, walletStatus]);

    const contextValue = useMemo(
        () => ({
            wallet,
            status: walletStatus,
            error: walletError,
            getWallet,
            createWallet,
            clientTEEConnection,
            otpSignerState,
            createDeviceSigner,
            createPasskeySigner,
        }),
        [
            getWallet,
            createWallet,
            wallet,
            walletStatus,
            walletError,
            clientTEEConnection,
            otpSignerState,
            createDeviceSigner,
            createPasskeySigner,
        ]
    );

    const hasUIProps =
        appearance != null || showOtpSignerPrompt != null || showPasskeyHelpers != null || renderUI != null;

    return (
        <CrossmintWalletBaseContext.Provider value={contextValue}>
            {hasUIProps ? (
                <CrossmintWalletUIBaseProvider
                    appearance={appearance}
                    showOtpSignerPrompt={showOtpSignerPrompt}
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
