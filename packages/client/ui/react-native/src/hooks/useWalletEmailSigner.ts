import { useState, useRef, useCallback, useContext, useEffect } from "react";
import { CrossmintWalletBaseContext } from "@crossmint/client-sdk-react-base";

const throwNotAvailable = (functionName: string) => () => {
    throw new Error(`${functionName} is not available. Make sure you're using an email signer wallet.`);
};

export type EmailSignerFunctions = {
    needsAuth: boolean;
    sendEmailWithOtp: () => Promise<void>;
    verifyOtp: (otp: string) => Promise<void>;
    reject: (error: Error) => void;
};

/**
 * Hook for accessing email signer authentication functions.
 * Provides access to email OTP authentication flow for headless implementations.
 */
export function useWalletEmailSigner(): EmailSignerFunctions {
    const context = useContext(CrossmintWalletBaseContext);

    if (!context) {
        throw new Error("useWalletEmailSigner must be used within CrossmintWalletProvider");
    }

    const [needsAuth, setNeedsAuth] = useState<boolean>(false);

    // Keep functions as refs to avoid unnecessary re-renders
    const sendEmailWithOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendEmailWithOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));
    const rejectRef = useRef<(error?: Error) => void>(throwNotAvailable("reject"));

    // Hook into the onAuthRequired system to populate our refs
    useEffect(() => {
        if (context.onAuthRequired) {
            // Store the original onAuthRequired
            const originalOnAuthRequired = context.onAuthRequired;

            // Replace it with our wrapper that updates the hook state
            context.onAuthRequired = async (
                needsAuth: boolean,
                sendEmailWithOtp: () => Promise<void>,
                verifyOtp: (otp: string) => Promise<void>,
                reject: () => void
            ) => {
                setNeedsAuth(needsAuth);
                sendEmailWithOtpRef.current = sendEmailWithOtp;
                verifyOtpRef.current = verifyOtp;
                rejectRef.current = reject;

                // If we're in headless mode, don't call the original handler
                // Let the hook consumer handle it manually
                if (context.experimental_headlessSigningFlow) {
                    return;
                }

                // Otherwise, call the original handler (for built-in UI)
                return await originalOnAuthRequired(needsAuth, sendEmailWithOtp, verifyOtp, reject);
            };
        }
    }, [context]);

    const sendEmailWithOtp = useCallback(async () => {
        return await sendEmailWithOtpRef.current();
    }, []);

    const verifyOtp = useCallback(async (otp: string) => {
        return await verifyOtpRef.current(otp);
    }, []);

    const reject = useCallback((error: Error) => {
        rejectRef.current(error);
    }, []);

    return {
        needsAuth,
        sendEmailWithOtp,
        verifyOtp,
        reject,
    };
}
