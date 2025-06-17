import { type ReactNode, useState, useCallback, useRef } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { createPortal } from "react-dom";
import { CrossmintWalletBaseProvider, useCrossmint, type CreateOnLogin } from "@crossmint/client-sdk-react-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { TwindProvider } from "./TwindProvider";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";

const throwNotAvailable = (functionName: string) => () => {
    throw new Error(`${functionName} is not available. Make sure you're using an email signer wallet.`);
};

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

type CrossmintWalletProviderProps = {
    children: ReactNode;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
    createOnLogin?: CreateOnLogin;
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
};

export function CrossmintWalletProvider({
    children,
    showPasskeyHelpers = true,
    appearance,
    createOnLogin,
    callbacks,
}: CrossmintWalletProviderProps) {
    const { experimental_customAuth } = useCrossmint();
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });
    const [emailSignerDialogOpen, setEmailSignerDialogOpen] = useState<boolean>(false);
    const [emailSignerDialogStep, setEmailSignerDialogStep] = useState<"initial" | "otp">("initial");

    const [needsAuthState, setNeedsAuthState] = useState<boolean>(false);
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

    const getCallbacks = () => {
        let onWalletCreationStart = callbacks?.onWalletCreationStart;
        let onTransactionStart = callbacks?.onTransactionStart;

        if (createOnLogin?.signer.type === "passkey" && showPasskeyHelpers) {
            onWalletCreationStart = createPasskeyPrompt("create-wallet");
            onTransactionStart = createPasskeyPrompt("transaction");
        }

        return { onWalletCreationStart, onTransactionStart };
    };

    const onAuthRequired = async (
        needsAuth: boolean,
        sendEmailWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => {
        setEmailSignerDialogOpen(needsAuth);
        setNeedsAuthState(needsAuth);
        sendEmailWithOtpRef.current = sendEmailWithOtp;
        verifyOtpRef.current = verifyOtp;
        rejectRef.current = reject;
    };

    return (
        <TwindProvider>
            <CrossmintWalletBaseProvider
                createOnLogin={createOnLogin}
                onAuthRequired={onAuthRequired}
                callbacks={getCallbacks()}
            >
                {children}

                {emailSignerDialogOpen && experimental_customAuth?.email != null
                    ? createPortal(
                          <EmailSignersDialog
                              rejectRef={rejectRef}
                              email={experimental_customAuth?.email}
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
            </CrossmintWalletBaseProvider>
        </TwindProvider>
    );
}
