import { useCallback, useContext } from "react";
import { CrossmintWalletBaseContext } from "@/providers/CrossmintWalletBaseProvider";

const throwNotAvailable = (functionName: string) => () => {
    throw new Error(`${functionName} is not available. Make sure you're using an email or phone signer wallet.`);
};

export type OtpSignerFunctions = {
    /** Whether the OTP signer currently requires authentication (OTP verification). */
    needsAuth: boolean;
    /** Sends a one-time password to the user (via email or phone, depending on the signer type). */
    sendOtp: () => Promise<void>;
    /** Verifies the one-time password entered by the user. */
    verifyOtp: (otp: string) => Promise<void>;
    /** Rejects the current authentication request with an error. */
    reject: (error: Error) => void;
};

/**
 * Hook for managing OTP-based signer authentication flows.
 * Provides OTP send/verify functions for wallets using an email or phone signer.
 * Must be used within a {@link CrossmintWalletProvider}.
 */
export function useWalletOtpSigner(): OtpSignerFunctions {
    const context = useContext(CrossmintWalletBaseContext);

    if (context == null) {
        throw new Error("useWalletOtpSigner must be used within CrossmintWalletProvider");
    }

    const { emailSignerState } = context;

    const sendOtp = useCallback(async () => {
        if (emailSignerState.sendOtp == null) {
            throwNotAvailable("sendOtp")();
        }
        return await emailSignerState.sendOtp?.();
    }, [emailSignerState.sendOtp]);

    const verifyOtp = useCallback(
        async (otp: string) => {
            if (emailSignerState.verifyOtp == null) {
                throwNotAvailable("verifyOtp")();
            }
            return await emailSignerState.verifyOtp?.(otp);
        },
        [emailSignerState.verifyOtp]
    );

    const reject = useCallback(
        (error: Error) => {
            if (emailSignerState.reject == null) {
                throwNotAvailable("reject")();
            }
            emailSignerState.reject?.(error);
        },
        [emailSignerState.reject]
    );

    return {
        needsAuth: emailSignerState.needsAuth,
        sendOtp,
        verifyOtp,
        reject,
    };
}
