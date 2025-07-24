import { CrossmintWalletEmailSignerContext } from "@/providers/CrossmintWalletProvider";
import { useContext } from "react";

export type OtpSignerFunctions = {
    needsAuth: boolean;
    sendOtp: () => Promise<void>;
    verifyOtp: (otp: string) => Promise<void>;
    reject: (error: Error) => void;
};

export function useWalletOtpSigner(): OtpSignerFunctions {
    const context = useContext(CrossmintWalletEmailSignerContext);

    if (context == null) {
        throw new Error("useWalletOtpSigner must be used within CrossmintWalletProvider");
    }

    if (!context.sendOtp || !context.verifyOtp || !context.reject) {
        throw new Error("Otp signer functions are not available. Make sure you're using an otp signer wallet.");
    }

    return {
        needsAuth: context.needsAuth,
        sendOtp: context.sendOtp,
        verifyOtp: context.verifyOtp,
        reject: context.reject,
    };
}
