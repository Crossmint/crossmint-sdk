import type { RecoveryMethodType } from "../types/recoveryMethod";

/**
 * Returns the reason a recovery method cannot be built from the form fields, or null when it is valid.
 * Email is optional (blank = logged-in user); passkey names default in the caller.
 */
export function getRecoveryMethodValidationError(type: RecoveryMethodType, fields: Record<string, string>) {
    switch (type) {
        case "phone":
            return fields.phone?.trim() ? null : "Phone number is required";
        case "external-wallet":
            return fields.address?.trim() ? null : "Wallet address is required";
        case "server":
            return fields.secret?.trim() ? null : "Signer secret is required";
        case "email":
        case "passkey":
            return null;
    }
}

/**
 * Build the signer config passed to createWallet / addRecoveryMethod from the form fields of the playground UI.
 * Passkeys are handled by the caller (they need the platform's createPasskeySigner).
 */
export function buildRecoveryMethodConfig(type: RecoveryMethodType, fields: Record<string, string>) {
    const error = getRecoveryMethodValidationError(type, fields);
    if (error != null) throw new Error(error);
    switch (type) {
        case "email":
            return fields.email ? { type, email: fields.email } : { type };
        case "phone":
            return { type, phone: fields.phone.trim() };
        case "external-wallet":
            return { type, address: fields.address.trim() };
        case "server":
            return { type, secret: fields.secret.trim() };
        case "passkey":
            return fields.name ? { type, name: fields.name } : { type };
    }
}
