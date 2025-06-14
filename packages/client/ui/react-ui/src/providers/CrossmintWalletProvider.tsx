import {
    type Dispatch,
    type ReactNode,
    type SetStateAction,
    createContext,
    useMemo,
    useState,
    useCallback,
    useEffect,
    useContext,
    useRef,
} from "react";
import { CrossmintWallets, type Wallet, type WalletArgsFor, type Chain } from "@crossmint/wallets-sdk";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { throwNotAvailable, type CreateOnLogin } from "@crossmint/client-sdk-react-base";
import { useCrossmint } from "../hooks";
import { createWebAuthnPasskeySigner } from "@/utils/createPasskeySigner";
import { TwindProvider } from "./TwindProvider";
import { useDynamicWallet } from "./dynamic/DynamicWalletProvider";
import type { PasskeySigner } from "@/types/passkey";
import { createPortal } from "react-dom";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";

type ValidPasskeyPromptType =
    | "create-wallet"
    | "transaction"
    | "not-supported"
    | "create-wallet-error"
    | "transaction-error";

type PasskeyPromptState =
    | {
          open: true;
          type: ValidPasskeyPromptType;
          primaryActionOnClick: () => void;
          secondaryActionOnClick?: () => void;
      }
    | {
          open: false;
      };

type ValidWalletState =
    | { status: "not-loaded" }
    | { status: "in-progress" }
    | { status: "error"; error: Error }
    | { status: "loaded"; wallet: Wallet<Chain> };

type WalletContextType = {
    walletState: ValidWalletState;
    setWalletState: Dispatch<SetStateAction<ValidWalletState>>;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
    createPasskeyPrompt: (type: ValidPasskeyPromptType) => () => Promise<void>;
    getOrCreateWallet: <C extends Chain>(
        args: WalletArgsFor<C>
    ) => Promise<{ startedCreation: boolean; reason?: string; wallet?: Wallet<C> }>;
    createPasskeySigner: () => Promise<PasskeySigner>;
    clearWallet: () => void;
};

export const WalletContext = createContext<WalletContextType | null>(null);

export function useWalletContext(componentName?: string) {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error(`useWallet must be used within WalletProvider${componentName ? ` (${componentName})` : ""}`);
    }
    return context;
}

export function CrossmintWalletProvider({
    children,
    showPasskeyHelpers = true,
    appearance,
    createOnLogin,
}: {
    children: ReactNode;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
    createOnLogin?: CreateOnLogin;
}) {
    const { crossmint, experimental_setCustomAuth } = useCrossmint(
        "CrossmintWalletProvider must be used within CrossmintProvider"
    );
    const email = crossmint.experimental_customAuth?.email;
    const { isDynamicWalletConnected, isDynamicProviderAvailable, getAdminSigner, hasDynamicSdkLoaded } =
        useDynamicWallet();
    const [walletState, setWalletState] = useState<ValidWalletState>({
        status: "not-loaded",
    });
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });
    const [emailSignerDialogOpen, setEmailSignerDialogOpen] = useState<boolean>(false);
    const [emailSignerDialogStep, setEmailSignerDialogStep] = useState<"initial" | "otp">("initial");

    const needsAuthRef = useRef<boolean>(false);
    const sendEmailWithOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendEmailWithOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));
    const rejectRef = useRef<(error: Error) => void>(throwNotAvailable("reject"));

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

    const emailsigners_handleSendEmailOTP = async () => {
        try {
            await sendEmailWithOtpRef.current();
            setEmailSignerDialogStep("otp");
        } catch (error) {
            console.error("Failed to send email OTP", error);
            rejectRef.current(new Error("Failed to send email OTP"));
        }
    };

    const emailsigners_handleOTPSubmit = async (otp: string) => {
        try {
            await verifyOtpRef.current(otp);
            setEmailSignerDialogOpen(false);
            setEmailSignerDialogStep("initial");
        } catch (error) {
            console.error("Failed to verify OTP", error);
            rejectRef.current(new Error("Failed to verify OTP"));
        }
    };

    const getOrCreateWallet = useCallback(
        async <C extends Chain>(args: WalletArgsFor<C>) => {
            if (walletState.status === "in-progress") {
                return { startedCreation: false };
            }

            if (crossmint.jwt == null) {
                return { startedCreation: false };
            }

            try {
                setWalletState({ status: "in-progress" });

                if (args?.signer?.type === "email") {
                    // biome-ignore lint/suspicious/useAwait: fix type later
                    args.signer.onAuthRequired = async (needsAuth, sendEmailWithOtp, verifyOtp, reject) => {
                        needsAuthRef.current = needsAuth;
                        sendEmailWithOtpRef.current = sendEmailWithOtp;
                        verifyOtpRef.current = verifyOtp;
                        rejectRef.current = reject;

                        if (needsAuth) {
                            setEmailSignerDialogOpen(true);
                            setEmailSignerDialogStep("initial");
                        }
                    };
                }

                const addPasskeyCallbacks = args.signer.type === "passkey" && showPasskeyHelpers;
                const wallets = CrossmintWallets.from(crossmint);
                const wallet = await wallets.getOrCreateWallet<C>({
                    ...args,
                    options: {
                        ...args.options,
                        ...(addPasskeyCallbacks && {
                            experimental_callbacks: {
                                onWalletCreationStart: createPasskeyPrompt("create-wallet"),
                                onTransactionStart: createPasskeyPrompt("transaction"),
                            },
                        }),
                    },
                });
                setWalletState({ status: "loaded", wallet });
                return { startedCreation: true, wallet };
            } catch (error) {
                console.error("Failed to create wallet:", error);
                setWalletState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
                return { startedCreation: false, reason: `Failed to create wallet ${error}` };
            }
        },
        [crossmint, walletState.status, createPasskeyPrompt, showPasskeyHelpers]
    );

    const createPasskeySigner = useCallback(async () => {
        return await createWebAuthnPasskeySigner(crossmint.apiKey);
    }, [crossmint.apiKey]);

    const clearWallet = useCallback(() => {
        setWalletState({ status: "not-loaded" });
    }, []);

    useEffect(() => {
        if (crossmint.experimental_customAuth?.jwt != null || crossmint.jwt != null) {
            clearWallet();
        }
    }, [crossmint.experimental_customAuth?.jwt, crossmint.jwt, clearWallet]);

    useEffect(() => {
        async function handleWalletGetOrCreate() {
            // Can get or create wallet if
            if (
                walletState.status !== "not-loaded" ||
                crossmint.jwt == null ||
                (isDynamicProviderAvailable && !hasDynamicSdkLoaded) ||
                createOnLogin?.chain == null
            ) {
                return;
            }

            try {
                const finalSigner =
                    isDynamicProviderAvailable && isDynamicWalletConnected
                        ? await getAdminSigner()
                        : createOnLogin.signer;

                await getOrCreateWallet({
                    chain: createOnLogin.chain,
                    signer: finalSigner,
                    owner: createOnLogin.owner,
                });
            } catch (error) {
                console.error("Failed to create wallet:", error);
                experimental_setCustomAuth(undefined);
            }
        }

        if (createOnLogin != null) {
            handleWalletGetOrCreate();
        }
    }, [
        walletState.status,
        crossmint.jwt,
        hasDynamicSdkLoaded,
        isDynamicWalletConnected,
        getAdminSigner,
        getOrCreateWallet,
        createPasskeyPrompt,
        createOnLogin?.chain,
        createOnLogin?.signer,
        createOnLogin?.owner,
    ]);

    useEffect(() => {
        if (crossmint.jwt == null && walletState.status !== "not-loaded") {
            clearWallet();
        }
    }, [crossmint.jwt, walletState.status, clearWallet]);

    const contextValue = useMemo(
        () => ({
            walletState,
            setWalletState,
            showPasskeyHelpers,
            appearance,
            createPasskeyPrompt,
            getOrCreateWallet,
            createPasskeySigner,
            clearWallet,
        }),
        [
            walletState,
            showPasskeyHelpers,
            appearance,
            createPasskeyPrompt,
            getOrCreateWallet,
            createPasskeySigner,
            clearWallet,
        ]
    );

    return (
        <TwindProvider>
            <WalletContext.Provider value={contextValue}>
                {children}

                {emailSignerDialogOpen && email != null
                    ? createPortal(
                          <EmailSignersDialog
                              rejectRef={rejectRef}
                              email={email}
                              open={emailSignerDialogOpen}
                              setOpen={setEmailSignerDialogOpen}
                              step={emailSignerDialogStep}
                              onSubmitOTP={emailsigners_handleOTPSubmit}
                              onResendOTPCode={emailsigners_handleSendEmailOTP}
                              onSubmitEmail={emailsigners_handleSendEmailOTP}
                              appearance={appearance}
                          />,
                          document.body
                      )
                    : null}
                {passkeyPromptState.open
                    ? createPortal(<PasskeyPrompt state={passkeyPromptState} appearance={appearance} />, document.body)
                    : null}
            </WalletContext.Provider>
        </TwindProvider>
    );
}
