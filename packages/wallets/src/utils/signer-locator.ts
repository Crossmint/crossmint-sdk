import type { Chain } from "../chains/chains";
import type { SignerLocator, SignerConfigForChain, ExternalWalletRegistrationConfig } from "../signers/types";
import type { RegisterSignerPasskeyParams } from "../api";

/**
 * Gmail ignores dots in the local part, so "first.last@gmail.com" and
 * "firstlast@gmail.com" are the same inbox. The backend normalizes at
 * wallet-creation time; we must match here so signer-locator comparisons
 * (e.g. `isRecoverySigner`, `signerIsRegistered`) don't fail.
 */
function normalizeEmailForLocator(email: string): string {
    const lower = email.toLowerCase();
    const atIndex = lower.indexOf("@");
    if (atIndex === -1) {
        return lower;
    }

    const localPart = lower.substring(0, atIndex);
    const domain = lower.substring(atIndex + 1);

    if (domain === "gmail.com" || domain === "googlemail.com") {
        return `${localPart.replace(/\./g, "")}@gmail.com`;
    }

    return lower;
}

/**
 * Converts a signer config to its locator string representation.
 * Shared utility used by both WalletFactory and Wallet.
 */
export function getSignerLocator<C extends Chain>(
    signer: SignerConfigForChain<C> | RegisterSignerPasskeyParams | ExternalWalletRegistrationConfig
): SignerLocator {
    if (signer.type === "external-wallet") {
        return `external-wallet:${signer.address}`;
    }
    if (signer.type === "email" && signer.email) {
        return `email:${normalizeEmailForLocator(signer.email)}`;
    }
    if (signer.type === "phone" && signer.phone) {
        return `phone:${signer.phone}`;
    }
    if (signer.type === "passkey" && "id" in signer) {
        return `passkey:${signer.id}`;
    }
    if (signer.type === "api-key") {
        return "api-key";
    }
    if (signer.type === "device") {
        if ("locator" in signer && signer.locator != null) {
            return signer.locator as SignerLocator;
        }
        return "device:" as `device:${string}`;
    }
    return signer.type as SignerLocator;
}

/**
 * Parses a signer locator string into its type and value components.
 */
export function parseSignerLocator(locator: SignerLocator): { type: string; value: string } {
    const colonIndex = locator.indexOf(":");
    if (colonIndex === -1) {
        return { type: locator, value: "" };
    }
    return {
        type: locator.substring(0, colonIndex),
        value: locator.substring(colonIndex + 1),
    };
}
