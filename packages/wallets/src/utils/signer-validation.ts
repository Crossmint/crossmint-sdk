import { WalletCreationError } from "./errors";

export function deepCompare(obj1: Record<string, unknown>, obj2: Record<string, unknown>, path = "") {
    if (obj1 === obj2) {
        return;
    }
    if (obj1 == null || obj2 == null) {
        throw new WalletCreationError(`Wallet signer ${path} does not match existing wallet's signer ${path}`);
    }
    for (const key of Object.keys(obj1)) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in obj2)) {
            throw new WalletCreationError(
                `Wallet signer ${newPath} does not match existing wallet's signer ${newPath}`
            );
        }
        deepCompare(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>, newPath);
    }
}
