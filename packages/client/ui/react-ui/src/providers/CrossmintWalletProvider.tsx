import { type Dispatch, type ReactNode, type SetStateAction, createContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CrossmintWallets, type Wallet, type WalletArgsFor, type Chain } from "@crossmint/wallets-sdk";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import type { PasskeySigner } from "@/types/passkey";
import { useCrossmint, throwNotAvailable } from "@crossmint/client-sdk-react-base";
import { createWebAuthnPasskeySigner } from "@/utils/createPasskeySigner";
import { deriveWalletErrorState } from "@/utils/errorUtils";
import { TwindProvider } from "./TwindProvider";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";

type ValidPasskeyPromptType =
    | "create-wallet"
    | "transaction"
    | "not-supported"
    | "create-wallet-error"
    | "transaction-error";
type PasskeyPromptState =
    | {
          type: ValidPasskeyPromptType;
          open: true;
          primaryActionOnClick: () => void;
          secondaryActionOnClick?: () => void;
      }
    | { open: false };

type ValidWalletState =
    | { status: "not-loaded" | "in-progress" }
    | { status: "loaded"; wallet: Wallet<Chain> }
    | { status: "loading-error"; error: string };

type WalletContextFunctions = {
    getOrCreateWallet: <C extends Chain>(
        props: WalletArgsFor<C>
    ) => Promise<{ startedCreation: boolean; reason?: string }>;
    createPasskeySigner: (name: string, promptType?: ValidPasskeyPromptType) => Promise<PasskeySigner | null>;
    clearWallet: () => void;
    passkeySigner?: PasskeySigner;
};

type LoadedWalletState<C extends Chain> = {
    status: "loaded";
    wallet: Wallet<C>;
    error?: undefined;
};

type WalletContext<C extends Chain = Chain> =
    | ({
          status: "not-loaded" | "in-progress";
          wallet?: undefined;
          error?: undefined;
      } & WalletContextFunctions)
    | ({
          status: "loading-error";
          wallet?: undefined;
          error: string;
      } & WalletContextFunctions)
    | (LoadedWalletState<C> & WalletContextFunctions);

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve({ startedCreation: false }),
    createPasskeySigner: () => Promise.resolve(null),
    clearWallet: () => {},
});

export function CrossmintWalletProvider({
    children,
    showPasskeyHelpers = true,
    appearance,
}: {
    children: ReactNode;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
}) {
    const [walletState, setWalletState] = useState<ValidWalletState>({
        status: "not-loaded",
    });

    const walletProviderProps = {
        walletState,
        setWalletState,
        showPasskeyHelpers,
        appearance,
    };

    return (
        <TwindProvider>
            <WalletProvider {...walletProviderProps}>{children}</WalletProvider>
        </TwindProvider>
    );
}

function WalletProvider({
    children,
    showPasskeyHelpers = true,
    appearance,
    walletState,
    setWalletState,
}: {
    children: ReactNode;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
    walletState: ValidWalletState;
    setWalletState: Dispatch<SetStateAction<ValidWalletState>>;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");

    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });
    const [email, setEmail] = useState<string>("");
    const [emailSignerDialogOpen, setEmailSignerDialogOpen] = useState<boolean>(false);
    const [emailSignerDialogStep, setEmailSignerDialogStep] = useState<"initial" | "otp">("initial");

    const needsAuthRef = useRef<boolean>(false);
    const sendEmailWithOtpRef = useRef<(email: string) => Promise<void>>(throwNotAvailable("sendEmailWithOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));
    const rejectRef = useRef<(error: Error) => void>(throwNotAvailable("reject"));

    const getOrCreateWallet = async <C extends Chain>(props: WalletArgsFor<C>) => {
        if (walletState.status == "in-progress") {
            return {
                startedCreation: false,
                reason: "Wallet is already loading.",
            };
        }

        if (crossmint.jwt == null) {
            return {
                startedCreation: false,
                reason: `Jwt not set in "CrossmintProvider".`,
            };
        }

        try {
            setWalletState({ status: "in-progress" });

            if (props?.signer?.type === "email") {
                if (props.signer.email) {
                    setEmail(props.signer.email);
                }

                // biome-ignore lint/suspicious/useAwait: fix type later
                props.signer.onAuthRequired = async (needsAuth, sendEmailWithOtp, verifyOtp, reject) => {
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

            const smartWalletSDK = CrossmintWallets.from({
                apiKey: crossmint.apiKey,
                jwt: crossmint?.jwt,
            });

            const wallet = await smartWalletSDK.getOrCreateWallet({
                ...props,
                options: {
                    experimental_callbacks: {
                        onWalletCreationStart: createPasskeyPrompt("create-wallet"),
                        onTransactionStart: createPasskeyPrompt("transaction"),
                    },
                },
            });
            setWalletState({
                status: "loaded",
                wallet,
            });
        } catch (error: unknown) {
            console.error("There was an error creating a wallet ", error);
            setWalletState(deriveWalletErrorState(error));
        }
        return { startedCreation: true };
    };

    const emailsigners_handleSendEmailOTP = async (emailAddress: string) => {
        try {
            setEmail(emailAddress);
            await sendEmailWithOtpRef.current(emailAddress);
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

    const createPasskeyPrompt = (type: ValidPasskeyPromptType) => () =>
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
        });

    const clearWallet = () => {
        setWalletState({ status: "not-loaded" });
    };

    const createPasskeySigner = async (name: string, promptType?: ValidPasskeyPromptType) => {
        if (promptType != null) {
            await createPasskeyPrompt(promptType)();
        }
        return await createWebAuthnPasskeySigner(name);
    };

    const contextValue = useMemo(
        () => ({
            ...walletState,
            getOrCreateWallet,
            createPasskeySigner,
            clearWallet,
        }),
        [walletState]
    );

    return (
        <WalletContext.Provider value={contextValue}>
            {children}

            {emailSignerDialogOpen
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
    );
}
