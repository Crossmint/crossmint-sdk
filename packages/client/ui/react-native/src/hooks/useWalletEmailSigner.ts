import { WalletContext } from "@crossmint/client-sdk-react-base";
import { useContext } from "react";

export type EmailSignerFunctions = {
    needsAuth: boolean;
    sendEmailWithOtp: () => Promise<void>;
    verifyOtp: (otp: string) => Promise<void>;
    reject: (error: Error) => void;
};

export function useWalletEmailSigner(): EmailSignerFunctions {
    const context = useContext(WalletContext);

    if (context == null) {
        throw new Error("useWalletEmailSigner must be used within CrossmintWalletProvider");
    }

    if (!context.sendEmailWithOtp || !context.verifyOtp || !context.reject) {
        throw new Error("Email signer functions are not available. Make sure you're using an email signer wallet.");
    }

    return {
        needsAuth: context.needsAuth,
        sendEmailWithOtp: context.sendEmailWithOtp,
        verifyOtp: context.verifyOtp,
        reject: context.reject,
    };
}
