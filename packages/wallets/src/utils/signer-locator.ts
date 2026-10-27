import type { Chain } from "../chains/chains";
import type {
    SignerLocator,
    SignerConfigForChain,
    ExternalWalletRegistrationConfig,
    PasskeySignerConfig,
    QuorumSigner,
} from "../signers/types";
import type { RegisterSignerPasskeyParams } from "../api";
import { normalizeEmail } from "./signer-validation";

const PASSKEY_LOCATOR_PREFIX = "passkey:";
const QUORUM_LOCATOR_PREFIX = "quorum:";

/** True for any `quorum:` locator, valid or not; `isQuorumLocator` also checks the id. */
export function hasQuorumLocatorPrefix(locator: string): boolean {
    return locator.startsWith(QUORUM_LOCATOR_PREFIX);
}

// EVM addresses ignore case, so `external-wallet:0x…` locators compare in lowercase (Kotlin `isSameLocator`).
// Every other locator compares exactly; callers pass locators from getSignerLocator, which normalizes emails.
export function comparableLocator(locator: string): string {
    if (locator.startsWith("external-wallet:0x")) {
        return locator.toLowerCase();
    }
    return locator;
}

export function isSameSignerLocator(left: string, right: string): boolean {
    return comparableLocator(left) === comparableLocator(right);
}

/** The credential id from `id` or a `passkey:{id}` locator, or null when the config carries neither. */
export function passkeyCredentialId(config: Pick<PasskeySignerConfig, "id" | "locator">): string | null {
    if (config.id != null && config.id !== "") {
        return config.id;
    }
    if (config.locator != null && config.locator.startsWith(PASSKEY_LOCATOR_PREFIX)) {
        const id = config.locator.slice(PASSKEY_LOCATOR_PREFIX.length);
        return id === "" ? null : id;
    }
    return null;
}

/**
 * Converts a signer config to its locator string representation.
 * Shared utility used by both WalletFactory and Wallet.
 */
export function getSignerLocator<C extends Chain>(
    signer: SignerConfigForChain<C> | RegisterSignerPasskeyParams | ExternalWalletRegistrationConfig | QuorumSigner
): SignerLocator {
    if (signer.type === "quorum") {
        return signer.locator;
    }
    if (signer.type === "external-wallet") {
        return `external-wallet:${signer.address}`;
    }
    if (signer.type === "email" && signer.email) {
        return `email:${normalizeEmail(signer.email)}`;
    }
    if (signer.type === "phone" && signer.phone) {
        return `phone:${signer.phone}`;
    }
    if (signer.type === "passkey") {
        const credentialId = passkeyCredentialId(signer);
        if (credentialId != null) {
            return `passkey:${credentialId}`;
        }
        if ("id" in signer) {
            return `passkey:${signer.id}`;
        }
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
