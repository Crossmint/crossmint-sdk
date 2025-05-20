import { useContext } from "react";
import {
    CrossmintRecoveryKeyContext,
    type CrossmintRecoveryKeyContextState,
} from "../providers/CrossmintRecoveryKeyProvider";

export function useWalletsAuth(): CrossmintRecoveryKeyContextState {
    const context = useContext(CrossmintRecoveryKeyContext);

    if (context == null) {
        throw new Error(
            "useWalletsAuth must be used within a CrossmintWalletProvider with experimental_enableRecoveryKeys enabled."
        );
    }

    return {
        experimental_needsAuth: context.experimental_needsAuth,
        experimental_createRecoveryKeySigner: context.experimental_createRecoveryKeySigner,
        experimental_sendEmailWithOtp: context.experimental_sendEmailWithOtp,
        experimental_verifyOtp: context.experimental_verifyOtp,
        experimental_clearStorage: context.experimental_clearStorage,
        onAuthRequired: context.onAuthRequired,
    };
}
