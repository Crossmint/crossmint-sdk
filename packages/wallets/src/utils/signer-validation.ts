import { isEmailValid } from "@crossmint/common-sdk-auth";
import { WalletCreationError } from "./errors";

const signerConfigMismatchErrorMessage = (fieldPath: string, newValue: unknown, existingValue: unknown) =>
    `Wallet signer configuration mismatch at "${fieldPath}" - expected "${existingValue}" from existing wallet but found "${newValue}"`;

/**
 * Normalizes an email address following the same logic as the backend.
 * For Gmail and Googlemail addresses:
 * - Removes dots from the local part (before @)
 * - Converts @googlemail.com to @gmail.com
 * For all addresses:
 * - Converts to lowercase
 */
function normalizeEmail(email: string): string {
    const lowerCaseEmail = email.toLowerCase();
    const emailParts = lowerCaseEmail.split("@");
    const domain = emailParts[1];

    const isGoogleMailDomain = domain === "googlemail.com";
    const isGmail = isGoogleMailDomain || domain === "gmail.com";
    const isGmailAndHasDots = isGmail && emailParts[0].includes(".");

    if (isGoogleMailDomain) {
        emailParts[1] = "gmail.com";
    }
    if (isGmailAndHasDots) {
        emailParts[0] = emailParts[0].replace(/\./g, "");
    }

    return `${emailParts[0]}@${emailParts[1]}`;
}

/**
 * Normalizes a value for comparison if it's an email address.
 * This ensures that email addresses are compared using the same normalization
 * logic as the backend (e.g., Gmail addresses with dots are normalized).
 */
function normalizeValueForComparison(value: unknown): unknown {
    if (typeof value === "string" && isEmailValid(value)) {
        return normalizeEmail(value);
    }
    return value;
}

export function compareSignerConfigs(
    newSignerConfig: Record<string, unknown>,
    existingSignerConfig: Record<string, unknown>,
    path = ""
) {
    if (newSignerConfig === existingSignerConfig) {
        return;
    }
    if (newSignerConfig == null || existingSignerConfig == null) {
        throw new Error(`Cannot compare null or undefined signer configs at path: ${path}`);
    }

    // Only compare keys that exist in both objects
    for (const key of Object.keys(newSignerConfig)) {
        if (!(key in existingSignerConfig)) {
            continue;
        }

        const fieldPath = path ? `${path}.${key}` : key;
        const newValue = newSignerConfig[key];
        const existingValue = existingSignerConfig[key];

        if (
            typeof newValue === "object" &&
            newValue !== null &&
            typeof existingValue === "object" &&
            existingValue !== null
        ) {
            compareSignerConfigs(
                newValue as Record<string, unknown>,
                existingValue as Record<string, unknown>,
                fieldPath
            );
        } else if (normalizeValueForComparison(newValue) !== normalizeValueForComparison(existingValue)) {
            throw new WalletCreationError(signerConfigMismatchErrorMessage(fieldPath, newValue, existingValue));
        }
    }
}
