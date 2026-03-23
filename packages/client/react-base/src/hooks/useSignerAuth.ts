import { useState, useRef, useCallback, type MutableRefObject } from "react";
import type { Callbacks } from "@crossmint/wallets-sdk";

const throwNotAvailable = (functionName: string) => () => {
    throw new Error(`${functionName} is not available. Make sure you're using an email or phone signer wallet.`);
};

export type SignerType = "email" | "phone";
export type DialogStep = "initial" | "otp";

export interface SignerAuthState {
    emailSignerDialogOpen: boolean;
    emailSignerDialogStep: DialogStep;
    setEmailSignerDialogOpen: (open: boolean) => void;
    setEmailSignerDialogStep: (step: DialogStep) => void;

    phoneSignerDialogOpen: boolean;
    phoneSignerDialogStep: DialogStep;
    setPhoneSignerDialogOpen: (open: boolean) => void;
    setPhoneSignerDialogStep: (step: DialogStep) => void;

    sendEmailOtpRef: MutableRefObject<() => Promise<void>>;
    verifyOtpRef: MutableRefObject<(otp: string) => Promise<void>>;
    sendPhoneOtpRef: MutableRefObject<() => Promise<void>>;
    verifyPhoneOtpRef: MutableRefObject<(otp: string) => Promise<void>>;
    rejectRef: MutableRefObject<(error?: Error) => void>;
}

export interface SignerAuthHandlers {
    emailsigners_handleSendEmailOTP: () => Promise<void>;
    emailsigners_handleOTPSubmit: (otp: string) => Promise<void>;
    emailsigners_handleResendOTP: () => Promise<void>;

    phonesigners_handleSendPhoneOTP: () => Promise<void>;
    phonesigners_handleOTPSubmit: (otp: string) => Promise<void>;
    phonesigners_handleResendOTP: () => Promise<void>;

    onAuthRequired: Callbacks["onAuthRequired"];
}

export function useSignerAuth(): SignerAuthState & SignerAuthHandlers {
    const [emailSignerDialogOpen, setEmailSignerDialogOpen] = useState<boolean>(false);
    const [emailSignerDialogStep, setEmailSignerDialogStep] = useState<DialogStep>("initial");
    const [phoneSignerDialogOpen, setPhoneSignerDialogOpen] = useState<boolean>(false);
    const [phoneSignerDialogStep, setPhoneSignerDialogStep] = useState<DialogStep>("initial");

    const sendEmailOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendEmailOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));
    const sendPhoneOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendPhoneOtp"));
    const verifyPhoneOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyPhoneOtp"));
    const rejectRef = useRef<(error?: Error) => void>(throwNotAvailable("reject"));

    const emailsigners_handleSendEmailOTP = useCallback(async () => {
        try {
            await sendEmailOtpRef.current();
            setEmailSignerDialogStep("otp");
        } catch (error) {
            console.error("Failed to send email OTP", error);
            rejectRef.current(new Error("Failed to send email OTP"));
        }
    }, []);

    const emailsigners_handleOTPSubmit = useCallback(async (otp: string) => {
        try {
            await verifyOtpRef.current(otp);
            setEmailSignerDialogOpen(false);
            setEmailSignerDialogStep("initial");
        } catch (error) {
            console.error("Failed to verify OTP", error);
            rejectRef.current(new Error("Failed to verify OTP"));
        }
    }, []);

    const emailsigners_handleResendOTP = useCallback(async () => {
        try {
            await sendEmailOtpRef.current();
        } catch (error) {
            console.error("Failed to resend email OTP", error);
            rejectRef.current(new Error("Failed to resend email OTP"));
        }
    }, []);

    // Phone authentication handlers
    const phonesigners_handleSendPhoneOTP = useCallback(async () => {
        try {
            await sendPhoneOtpRef.current();
            setPhoneSignerDialogStep("otp");
        } catch (error) {
            console.error("Failed to send phone OTP", error);
            rejectRef.current(new Error("Failed to send phone OTP"));
        }
    }, []);

    const phonesigners_handleOTPSubmit = useCallback(async (otp: string) => {
        try {
            await verifyPhoneOtpRef.current(otp);
            setPhoneSignerDialogOpen(false);
            setPhoneSignerDialogStep("initial");
        } catch (error) {
            console.error("Failed to verify phone OTP", error);
            rejectRef.current(new Error("Failed to verify phone OTP"));
        }
    }, []);

    const phonesigners_handleResendOTP = useCallback(async () => {
        try {
            await sendPhoneOtpRef.current();
        } catch (error) {
            console.error("Failed to resend phone OTP", error);
            rejectRef.current(new Error("Failed to resend phone OTP"));
        }
    }, []);

    const onAuthRequired: Callbacks["onAuthRequired"] = useCallback(
        (
            signerType: "email" | "phone",
            signerLocator: string,
            needsAuth: boolean,
            sendMessageWithOtp: () => Promise<void>,
            verifyOtp: (otp: string) => Promise<void>,
            reject: () => void
        ) => {
            const signerValue = signerLocator.split(":")[1];
            if (signerType === "phone" && signerValue != null) {
                setPhoneSignerDialogOpen(needsAuth);
                sendPhoneOtpRef.current = sendMessageWithOtp;
                verifyPhoneOtpRef.current = verifyOtp;
            } else if (signerType === "email" && signerValue != null) {
                setEmailSignerDialogOpen(needsAuth);
                sendEmailOtpRef.current = sendMessageWithOtp;
                verifyOtpRef.current = verifyOtp;
            }
            rejectRef.current = reject;
            return Promise.resolve();
        },
        []
    );

    return {
        emailSignerDialogOpen,
        emailSignerDialogStep,
        setEmailSignerDialogOpen,
        setEmailSignerDialogStep,
        phoneSignerDialogOpen,
        phoneSignerDialogStep,
        setPhoneSignerDialogOpen,
        setPhoneSignerDialogStep,

        sendEmailOtpRef,
        verifyOtpRef,
        sendPhoneOtpRef,
        verifyPhoneOtpRef,
        rejectRef,

        emailsigners_handleSendEmailOTP,
        emailsigners_handleOTPSubmit,
        emailsigners_handleResendOTP,
        phonesigners_handleSendPhoneOTP,
        phonesigners_handleOTPSubmit,
        phonesigners_handleResendOTP,
        onAuthRequired,
    };
}
