import type { ValidPasskeyPromptType } from "@/providers";

export function getOnClosePasskeyPromptError(type: ValidPasskeyPromptType) {
    switch (type) {
        case "create-wallet":
        case "create-wallet-error":
            return {
                type: "wallet-creation-failed",
                message: "Wallet creation failed due to the user rejecting the request",
            };
        case "transaction":
        case "transaction-error":
            return {
                type: "wallet-access-failed",
                message:
                    "Wallet access failed due to the user rejecting the request, a timeout or the user not having access to their passkey",
            };
        case "not-supported":
            return {
                type: "device-not-supported",
                message: "Passkeys are not supported on this device",
            };
        default:
            return {
                type: "unknown-error",
                message: "An unknown error occurred",
            };
    }
}
