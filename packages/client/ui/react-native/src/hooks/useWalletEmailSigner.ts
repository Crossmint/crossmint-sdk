import { useCallback, useContext } from "react";
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
