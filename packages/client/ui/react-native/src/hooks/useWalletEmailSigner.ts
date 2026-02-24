import { useCallback, useContext } from "react";
import { CrossmintWalletBaseContext } from "@crossmint/client-sdk-react-base";

const throwNotAvailable = (functionName: string) => () => {
    throw new Error(`${functionName} is not available. Make sure you're using an email signer wallet.`);
};

export type EmailSignerFunctions = {
    /** Whether the email signer currently requires authentication (OTP verification). */
    needsAuth: boolean;
    /** Sends a one-time password to the user's email address. */
    sendEmailWithOtp: () => Promise<void>;
    /** Verifies the one-time password entered by the user. */
    verifyOtp: (otp: string) => Promise<void>;
    /** Rejects the current authentication request with an error. */
    reject: (error: Error) => void;
};

/**
 * Hook for managing email-based signer authentication flows.
 * Provides OTP send/verify functions for wallets using an email signer.
 * Must be used within a {@link CrossmintWalletProvider}.
 */
export function useWalletEmailSigner(): EmailSignerFunctions {
    const context = useContext(CrossmintWalletBaseContext);

    if (context == null) {
        throw new Error("useWalletEmailSigner must be used within CrossmintWalletProvider");
    }

    const { emailSignerState } = context;

    const sendEmailWithOtp = useCallback(async () => {
        if (!emailSignerState.sendEmailWithOtp) {
            throwNotAvailable("sendEmailWithOtp")();
        }
        return await emailSignerState.sendEmailWithOtp?.();
    }, [emailSignerState.sendEmailWithOtp]);

    const verifyOtp = useCallback(
        async (otp: string) => {
            if (!emailSignerState.verifyOtp) {
                throwNotAvailable("verifyOtp")();
            }
            return await emailSignerState.verifyOtp?.(otp);
        },
        [emailSignerState.verifyOtp]
    );

    const reject = useCallback(
        (error: Error) => {
            if (!emailSignerState.reject) {
                throwNotAvailable("reject")();
            }
            emailSignerState.reject?.(error);
        },
        [emailSignerState.reject]
    );

    return {
        needsAuth: emailSignerState.needsAuth,
        sendEmailWithOtp,
        verifyOtp,
        reject,
    };
}
