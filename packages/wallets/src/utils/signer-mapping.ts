import type { DelegatedSigner as APIDelegatedSigner } from "../api";
import type { DelegatedSigner, SignerStatus } from "../wallets/types";
import type { Chain } from "../chains/chains";

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
type DelegatedSignerBase = DistributiveOmit<DelegatedSigner, "status">;

export function extractSignerBase(apiSigner: APIDelegatedSigner): DelegatedSignerBase {
    switch (apiSigner.type) {
        case "passkey":
            return {
                type: "passkey",
                id: apiSigner.id,
                name: apiSigner.name,
                publicKey: apiSigner.publicKey,
                validatorContractVersion: apiSigner.validatorContractVersion,
                locator: apiSigner.locator,
            };
        case "api-key":
            return {
                type: "api-key",
                address: apiSigner.address,
                locator: apiSigner.locator,
            };
        case "external-wallet":
            return {
                type: "external-wallet",
                address: apiSigner.address,
                locator: apiSigner.locator,
            };
        case "email":
            return {
                type: "email",
                email: apiSigner.email,
                address: apiSigner.address,
                locator: apiSigner.locator,
            };
        case "phone":
            return {
                type: "phone",
                phone: apiSigner.phone,
                address: apiSigner.address,
                locator: apiSigner.locator,
            };
        case "device":
            return {
                type: "device",
                publicKey: apiSigner.publicKey,
                locator: apiSigner.locator,
            };
        case "server":
            return {
                type: "server",
                address: apiSigner.address,
                locator: apiSigner.locator,
            };
        default:
            throw new Error(`Unknown signer type: ${(apiSigner as { type: string }).type}`);
    }
}

/**
 * Maps a full API signer response (DelegatedSignerV2025Dto) to a DelegatedSigner.
 * For EVM chains, extracts the per-chain status. Returns null if no approval exists for the chain.
 * For Solana/Stellar, extracts the transaction status.
 */
export function mapApiSignerToDelegatedSigner(apiSigner: APIDelegatedSigner, chain: Chain): DelegatedSigner | null {
    const base = extractSignerBase(apiSigner);

    if (chain === "solana" || chain === "stellar") {
        // For Solana/Stellar, status comes from the transaction field
        let status: SignerStatus = "success";
        if ("transaction" in apiSigner && apiSigner.transaction != null) {
            status = apiSigner.transaction.status;
        }
        return { ...base, status } as DelegatedSigner;
    }

    // For EVM, status comes from the chains field
    if ("chains" in apiSigner && apiSigner.chains != null && Object.keys(apiSigner.chains).length > 0) {
        const chainEntry = apiSigner.chains[chain];
        if (chainEntry == null) {
            return null; // No approval for this chain
        }
        return { ...base, status: chainEntry.status } as DelegatedSigner;
    }

    // If chains field is empty, the signer was created during wallet creation.
    return { ...base, status: "success" } as DelegatedSigner;
}

/**
 * Maps a wallet config signer (from getWallet response) to a DelegatedSigner with a given status.
 * Used for Solana/Stellar where signers in the config are already fully registered.
 */
export function mapConfigSignerToDelegatedSigner(
    configSigner: { type: string; locator: string; [key: string]: unknown },
    status: SignerStatus
): DelegatedSigner {
    const base: Record<string, unknown> = { ...configSigner, status };
    // Ensure locator has proper prefix
    const colonIndex = configSigner.locator.indexOf(":");
    if (colonIndex === -1) {
        if (configSigner.type === "api-key") {
            base.locator = configSigner.locator;
        } else {
            base.locator = `external-wallet:${configSigner.locator}`;
            base.type = "external-wallet";
        }
    }
    return base as DelegatedSigner;
}
