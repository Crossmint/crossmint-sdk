import { WalletCreationError } from "./errors";

const signersDontMatchErrorMessage = (newPath: string, val1: unknown, val2: unknown) =>
    `Wallet signer configuration mismatch at "${newPath}" - expected "${val2}" from existing wallet but found "${val1}"`;

export function deepCompare(obj1: Record<string, unknown>, obj2: Record<string, unknown>, path = "") {
    if (obj1 === obj2) {
        return;
    }
    if (obj1 == null || obj2 == null) {
        throw new Error(`Cannot compare null or undefined objects at path: ${path}`);
    }
    for (const key of Object.keys(obj1)) {
        const newPath = path ? `${path}.${key}` : key;
        const val1 = obj1[key];
        const val2 = obj2[key];

        if (!(key in obj2)) {
            throw new WalletCreationError(signersDontMatchErrorMessage(newPath, val1, val2));
        }
        if (typeof val1 === "object" && val1 !== null && typeof val2 === "object" && val2 !== null) {
            deepCompare(val1 as Record<string, unknown>, val2 as Record<string, unknown>, newPath);
        } else if (val1 !== val2) {
            throw new WalletCreationError(signersDontMatchErrorMessage(newPath, val1, val2));
        }
    }
}
