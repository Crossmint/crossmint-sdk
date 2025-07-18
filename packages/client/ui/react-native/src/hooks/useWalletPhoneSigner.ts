import { CrossmintWalletPhoneSignerContext } from "@/providers/CrossmintWalletProvider";
import { useContext } from "react";

export type PhoneSignerFunctions = {
    needsAuth: boolean;
    sendPhoneWithOtp: () => Promise<void>;
    verifyPhoneOtp: (otp: string) => Promise<void>;
    reject: (error: Error) => void;
};

export function useWalletPhoneSigner(): PhoneSignerFunctions {
    const context = useContext(CrossmintWalletPhoneSignerContext);

    if (context == null) {
        throw new Error("useWalletPhoneSigner must be used within CrossmintWalletProvider");
    }

    if (!context.sendPhoneWithOtp || !context.verifyPhoneOtp || !context.reject) {
        throw new Error("Phone signer functions are not available. Make sure you're using a phone signer wallet.");
    }

    return {
        needsAuth: context.needsAuth,
        sendPhoneWithOtp: context.sendPhoneWithOtp,
        verifyPhoneOtp: context.verifyPhoneOtp,
        reject: context.reject,
    };
}
