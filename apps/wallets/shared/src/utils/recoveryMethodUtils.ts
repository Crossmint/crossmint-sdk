import type { RecoveryMethodType } from "../types/recoveryMethod";

/**
 * Build the signer config passed to createWallet / addRecoveryMethod from the form fields of the playground UI.
 * Passkeys are handled by the caller (they need the platform's createPasskeySigner).
 */
export function buildRecoveryMethodConfig(type: RecoveryMethodType, fields: Record<string, string>) {
    switch (type) {
        case "email":
            return fields.email ? { type, email: fields.email } : { type };
        case "phone":
            return fields.phone ? { type, phone: fields.phone } : { type };
        case "external-wallet":
            return { type, address: fields.address ?? "" };
        case "server":
            return { type, secret: fields.secret ?? "" };
        case "passkey":
            return fields.name ? { type, name: fields.name } : { type };
    }
}
