import type { Signer as APISigner, Scope } from "../api";
import type { PendingApproval, PendingSignerOperation, Signer, SignerStatus } from "../wallets/types";
import type { Chain } from "../chains/chains";
import { requireQuorumLocator, type QuorumMember, type QuorumSigner } from "../signers/types";
import { isQuorumPendingApproval } from "../quorum/approvals";

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
type SignerBase = DistributiveOmit<Signer, "status">;

export function extractSignerBase(apiSigner: APISigner): SignerBase {
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
                name: apiSigner.name,
            };
        case "server":
            return {
                type: "server",
                address: apiSigner.address,
                locator: apiSigner.locator,
            };
        case "quorum":
            return toQuorumSigner(apiSigner);
        default:
            throw new Error(`Unknown signer type: ${(apiSigner as { type: string }).type}`);
    }
}

/** A quorum entry as the API returns it, with its locator checked. */
export function toQuorumSigner(apiQuorum: {
    locator: string;
    threshold: number;
    members: QuorumMember[];
}): QuorumSigner {
    return {
        type: "quorum",
        locator: requireQuorumLocator(apiQuorum.locator),
        threshold: apiQuorum.threshold,
        members: apiQuorum.members,
    };
}

/**
 * Maps a full API signer response (DelegatedSignerV2025Dto) to a Signer.
 * For EVM chains, extracts the per-chain status. Returns null if no approval exists for the chain.
 * For Solana/Stellar, extracts the transaction status.
 */
export function mapApiSignerToSigner(apiSigner: APISigner, chain: Chain): Signer | null {
    const base = extractSignerBase(apiSigner);

    const scopes = "scopes" in apiSigner ? (apiSigner.scopes as Scope[] | undefined) : undefined;

    if (chain === "solana" || chain === "stellar") {
        // For Solana/Stellar, status comes from the transaction field
        let status: SignerStatus = "success";
        if ("transaction" in apiSigner && apiSigner.transaction != null) {
            status = apiSigner.transaction.status;
        }
        return { ...base, status, ...(scopes != null && { scopes }) } as Signer;
    }

    if (!isSignerOnChain(apiSigner, chain)) {
        return null; // No approval for this chain
    }
    // For EVM, status comes from the chains field; with none, the signer was created during wallet creation.
    const chainEntry = "chains" in apiSigner ? apiSigner.chains?.[chain] : undefined;
    return { ...base, status: chainEntry?.status ?? "success", ...(scopes != null && { scopes }) } as Signer;
}

/** Whether a listed signer is registered on `chain`. An EVM signer lists its chains; with none, it is on every chain. */
export function isSignerOnChain(
    apiSigner: { locator: string; chains?: Record<string, unknown> | null },
    chain: Chain
): boolean {
    if (chain === "solana" || chain === "stellar" || apiSigner.chains == null) {
        return true;
    }
    return Object.keys(apiSigner.chains).length === 0 || apiSigner.chains[chain] != null;
}

/** Whether a signer's pending registration waits on quorum members: its request has a quorum entry pending. */
export function registrationAwaitsQuorum(apiSigner: APISigner, chain: Chain): boolean {
    return pendingRegistrationApprovals(apiSigner, chain).some(isQuorumPendingApproval);
}

function pendingRegistrationApprovals(apiSigner: APISigner, chain: Chain): PendingApproval[] {
    if (chain === "solana" || chain === "stellar") {
        if ("transaction" in apiSigner && apiSigner.transaction != null) {
            return (apiSigner.transaction.approvals?.pending ?? []) as PendingApproval[];
        }
        return [];
    }
    const chainEntry = "chains" in apiSigner ? apiSigner.chains?.[chain] : undefined;
    if (chainEntry != null && "approvals" in chainEntry) {
        return (chainEntry.approvals?.pending ?? []) as PendingApproval[];
    }
    return [];
}

export function getPendingSignerOperation(apiSigner: APISigner, chain: Chain): PendingSignerOperation | null {
    if (chain === "solana" || chain === "stellar") {
        if (
            "transaction" in apiSigner &&
            apiSigner.transaction != null &&
            (apiSigner.transaction.status === "pending" || apiSigner.transaction.status === "awaiting-approval")
        ) {
            return { type: "transaction", id: apiSigner.transaction.id };
        }
        return null;
    }

    if ("chains" in apiSigner && apiSigner.chains != null) {
        const chainEntry = apiSigner.chains[chain];
        if (chainEntry != null && (chainEntry.status === "pending" || chainEntry.status === "awaiting-approval")) {
            const operationType = "onChain" in chainEntry ? "transaction" : "signature";
            return { type: operationType, id: chainEntry.id };
        }
    }

    return null;
}

/**
 * Maps a wallet config signer (from getWallet response) to a Signer with a given status.
 * Used for Solana/Stellar where signers in the config are already fully registered.
 */
export function mapConfigSignerToSigner(
    configSigner: { type: string; locator: string; [key: string]: unknown },
    status: SignerStatus
): Signer {
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
    return base as Signer;
}
