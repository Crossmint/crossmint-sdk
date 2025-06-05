import { WalletCreationError } from "./errors";

export function deepCompare(obj1: Record<string, unknown>, obj2: Record<string, unknown>, path = "") {
    if (obj1 === obj2) {
        return;
    }
    if (obj1 == null || obj2 == null) {
        throw new Error(`Cannot compare null or undefined objects at path: ${path}`);
    }
    for (const key of Object.keys(obj1)) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in obj2)) {
            throw new WalletCreationError(
                `Wallet signer configuration mismatch at "${newPath}" - expected "${obj2[key]}" from existing wallet but found "${obj1[key]}"`
            );
        }
        deepCompare(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>, newPath);
    }
}
