import type { CrossmintAuthEmbeddedWallets } from "@crossmint/client-sdk-react-base";
import type { EVMSignerInput, SolanaSignerInput } from "@crossmint/wallets-sdk";
type EOAAdminSigner = { type: "evm-keypair" | "solana-keypair"; address: string } | null;
const EOA_SIGNER_STORAGE_KEY = "eoaSigner";

export function setEOASigner(signer: EOAAdminSigner) {
    if (typeof window === "undefined") {
        return;
    }
    localStorage.setItem(EOA_SIGNER_STORAGE_KEY, JSON.stringify(signer));
}
export function getEOASigner() {
    if (typeof window === "undefined") {
        return null;
    }
    const signer = localStorage.getItem(EOA_SIGNER_STORAGE_KEY) ?? "null";
    const parsedSigner = JSON.parse(signer) as EOAAdminSigner;
    return parsedSigner;
}
export function clearEOASigner() {
    if (typeof window === "undefined") {
        return;
    }
    localStorage.removeItem(EOA_SIGNER_STORAGE_KEY);
}
export function getCompatibleEOASigner(walletType: CrossmintAuthEmbeddedWallets["type"]) {
    const EOASigner = getEOASigner();
    if (
        EOASigner != null &&
        ((EOASigner.type === "evm-keypair" && walletType === "solana-smart-wallet") ||
            (EOASigner.type === "solana-keypair" && walletType === "evm-smart-wallet"))
    ) {
        console.warn("Mismatching EOA signer type and wallet type, clearing EOA signer from storage");
        clearEOASigner();
        return undefined;
    }
    if (EOASigner != null) {
        // If the user is signing in with an EOA wallet, use the EOA wallet as the admin signer
        return {
            type: EOASigner.type,
            address: EOASigner.address,
        } as EVMSignerInput | SolanaSignerInput;
    }
    return undefined;
}
