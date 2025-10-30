import { useState, useRef, useCallback, type MutableRefObject } from "react";
import type { CreateOnLogin } from "@/types";

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

    sendEmailWithOtpRef: MutableRefObject<() => Promise<void>>;
    verifyOtpRef: MutableRefObject<(otp: string) => Promise<void>>;
    sendPhoneWithOtpRef: MutableRefObject<() => Promise<void>>;
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

    onAuthRequired: (
        needsAuth: boolean,
        sendMessageWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => Promise<void>;
}

export function useSignerAuth(createOnLogin?: CreateOnLogin): SignerAuthState & SignerAuthHandlers {
    const [emailSignerDialogOpen, setEmailSignerDialogOpen] = useState<boolean>(false);
    const [emailSignerDialogStep, setEmailSignerDialogStep] = useState<DialogStep>("initial");
    const [phoneSignerDialogOpen, setPhoneSignerDialogOpen] = useState<boolean>(false);
    const [phoneSignerDialogStep, setPhoneSignerDialogStep] = useState<DialogStep>("initial");

    const sendEmailWithOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendEmailWithOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));
    const sendPhoneWithOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendPhoneWithOtp"));
    const verifyPhoneOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyPhoneOtp"));
    const rejectRef = useRef<(error?: Error) => void>(throwNotAvailable("reject"));

    const emailsigners_handleSendEmailOTP = useCallback(async () => {
        try {
            await sendEmailWithOtpRef.current();
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
            await sendEmailWithOtpRef.current();
        } catch (error) {
            console.error("Failed to resend email OTP", error);
            rejectRef.current(new Error("Failed to resend email OTP"));
        }
    }, []);

    // Phone authentication handlers
    const phonesigners_handleSendPhoneOTP = useCallback(async () => {
        try {
            await sendPhoneWithOtpRef.current();
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
            await sendPhoneWithOtpRef.current();
        } catch (error) {
            console.error("Failed to resend phone OTP", error);
            rejectRef.current(new Error("Failed to resend phone OTP"));
        }
    }, []);

    const onAuthRequired = useCallback(
        async (
            needsAuth: boolean,
            sendMessageWithOtp: () => Promise<void>,
            verifyOtp: (otp: string) => Promise<void>,
            reject: () => void
        ): Promise<void> => {
            if (createOnLogin?.signer.type === "phone" && createOnLogin.signer.phone) {
                setPhoneSignerDialogOpen(needsAuth);
                sendPhoneWithOtpRef.current = sendMessageWithOtp;
                verifyPhoneOtpRef.current = verifyOtp;
            } else {
                setEmailSignerDialogOpen(needsAuth);
                sendEmailWithOtpRef.current = sendMessageWithOtp;
                verifyOtpRef.current = verifyOtp;
            }
            rejectRef.current = reject;
        },
        [createOnLogin?.signer.type, createOnLogin?.signer]
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

        sendEmailWithOtpRef,
        verifyOtpRef,
        sendPhoneWithOtpRef,
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
