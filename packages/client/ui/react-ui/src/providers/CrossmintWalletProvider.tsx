import { type ReactNode, useState, useCallback, useRef } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { createPortal } from "react-dom";
import { CrossmintWalletBaseProvider, useCrossmint, type CreateOnLogin } from "@crossmint/client-sdk-react-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";
import { PhoneSignersDialog } from "@/components/signers/PhoneSignersDialog";

const throwNotAvailable = (functionName: string) => () => {
    throw new Error(`${functionName} is not available. Make sure you're using an email or phone signer wallet.`);
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

    // Email signer state (for main wallet authentication)
    const [emailSignerDialogOpen, setEmailSignerDialogOpen] = useState<boolean>(false);
    const [emailSignerDialogStep, setEmailSignerDialogStep] = useState<"initial" | "otp">("initial");

    // Phone signer state (for TEE handshake)
    const [phoneSignerDialogOpen, setPhoneSignerDialogOpen] = useState<boolean>(false);
    const [phoneSignerDialogStep, setPhoneSignerDialogStep] = useState<"initial" | "otp">("initial");

    const [needsAuthState, setNeedsAuthState] = useState<boolean>(false);

    // Email signer refs (for main wallet authentication)
    const sendOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));

    // Phone signer refs (for TEE handshake)
    const sendPhoneWithOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendPhoneWithOtp"));
    const verifyPhoneOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyPhoneOtp"));

    const rejectRef = useRef<(error: Error) => void>(throwNotAvailable("reject"));
    const phoneNumber =
        createOnLogin?.signer.type === "phone" && createOnLogin?.signer.phone != null
            ? createOnLogin.signer.phone
            : experimental_customAuth?.phone;

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
            await sendOtpRef.current();
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

    // Phone authentication handlers (for TEE handshake)
    const phonesigners_handleSendPhoneOTP = async () => {
        try {
            await sendPhoneWithOtpRef.current();
            setPhoneSignerDialogStep("otp");
        } catch (error) {
            console.error("Failed to send phone OTP", error);
            rejectRef.current(new Error("Failed to send phone OTP"));
        }
    };

    const phonesigners_handleOTPSubmit = async (otp: string) => {
        try {
            await verifyPhoneOtpRef.current(otp);
            setPhoneSignerDialogOpen(false);
            setPhoneSignerDialogStep("initial");
        } catch (error) {
            console.error("Failed to verify phone OTP", error);
            rejectRef.current(new Error("Failed to verify phone OTP"));
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
        sendMessageWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => {
        // Check if we're dealing with a phone signer
        if (createOnLogin?.signer.type === "phone" && createOnLogin.signer.phone) {
            setPhoneSignerDialogOpen(needsAuth);
            sendPhoneWithOtpRef.current = sendMessageWithOtp;
            verifyPhoneOtpRef.current = verifyOtp;
        } else {
            // Default email signer behavior
            setEmailSignerDialogOpen(needsAuth);
            sendOtpRef.current = sendMessageWithOtp;
            verifyOtpRef.current = verifyOtp;
        }
        setNeedsAuthState(needsAuth);
        rejectRef.current = reject;
    };

    return (
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
            {phoneSignerDialogOpen && phoneNumber != null
                ? createPortal(
                      <PhoneSignersDialog
                          rejectRef={rejectRef}
                          phone={phoneNumber}
                          open={phoneSignerDialogOpen}
                          setOpen={setPhoneSignerDialogOpen}
                          step={phoneSignerDialogStep}
                          onSubmitOTP={phonesigners_handleOTPSubmit}
                          onResendOTPCode={phonesigners_handleSendPhoneOTP}
                          onSubmitPhone={phonesigners_handleSendPhoneOTP}
                          appearance={appearance}
                      />,
                      document.body
                  )
                : null}
            {passkeyPromptState.open
                ? createPortal(<PasskeyPrompt state={passkeyPromptState} appearance={appearance} />, document.body)
                : null}
        </CrossmintWalletBaseProvider>
    );
}
