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

    const { otpSignerState } = context;

    const sendOtp = useCallback(async () => {
        if (otpSignerState.sendOtp == null) {
            throwNotAvailable("sendOtp")();
        }
        return await otpSignerState.sendOtp?.();
    }, [otpSignerState.sendOtp]);

    const verifyOtp = useCallback(
        async (otp: string) => {
            if (otpSignerState.verifyOtp == null) {
                throwNotAvailable("verifyOtp")();
            }
            return await otpSignerState.verifyOtp?.(otp);
        },
        [otpSignerState.verifyOtp]
    );

    const reject = useCallback(
        (error: Error) => {
            if (otpSignerState.reject == null) {
                throwNotAvailable("reject")();
            }
            otpSignerState.reject?.(error);
        },
        [otpSignerState.reject]
    );

    return {
        needsAuth: otpSignerState.needsAuth,
        sendOtp,
        verifyOtp,
        reject,
    };
}
