import { WalletCreationError } from "./errors";

const signerConfigMismatchErrorMessage = (fieldPath: string, newValue: unknown, existingValue: unknown) =>
    `Wallet signer configuration mismatch at "${fieldPath}" - expected "${existingValue}" from existing wallet but found "${newValue}"`;

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
        } else if (newValue !== existingValue) {
            throw new WalletCreationError(signerConfigMismatchErrorMessage(fieldPath, newValue, existingValue));
        }
    }
}
