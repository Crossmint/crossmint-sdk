import type { ApiClient, GetSignerResponse, WalletLocator } from "../../api";
import type { Chain } from "../../chains/chains";
import { getSignerDescriptor, type SignerDescriptorContext } from "../../signers/descriptors";
import type { ServerSignerResolver } from "../../signers/server/resolver";
import { assembleSigner } from "../../signers";
import {
    isApiSourcedServerSignerConfig,
    type InternalSignerConfig,
    type RecoverySignerConfigForChain,
    type ResolvedQuorumMember,
    type ServerSignerConfig,
    type SignerAdapter,
    type SignerConfigForChain,
    type SignerLocator,
    type ResolvedRecoveryConfigForChain,
} from "../../signers/types";
import { getPendingSignerOperation, mapApiSignerToSigner } from "../../utils/signer-mapping";
import { getQuorumMemberLocator, matchesQuorumMember } from "../../utils/quorum-members";
import { walletsLogger } from "../../logger";
import type { PendingSignerOperation, Signer as WalletSigner, SignerStatus, WalletOptions } from "../types";

export type SignerManagerParams<C extends Chain> = {
    apiClient: ApiClient;
    options: WalletOptions | undefined;
    chain: C;
    walletAddress: string;
    walletLocator: () => WalletLocator;
    serverSignerResolver: ServerSignerResolver;
    recovery: ResolvedRecoveryConfigForChain<C>;
    initialSigners: SignerConfigForChain<C>[];
    signers: () => Promise<WalletSigner[]>;
    signer?: SignerAdapter;
};

export class SignerManager<C extends Chain> {
    #activeSigner: SignerAdapter | undefined;
    #recovery: ResolvedRecoveryConfigForChain<C>;
    // Quorum members the caller explicitly selected via useSigner() this session. Recovery
    // flows may silently reuse these, and only these — never a member the caller didn't pick.
    #adoptedQuorumMemberLocators = new Set<string>();
    #apiClient: ApiClient;
    #options: WalletOptions | undefined;
    #chain: C;
    #walletAddress: string;
    #walletLocator: () => WalletLocator;
    #serverSignerResolver: ServerSignerResolver;
    #initialSigners: SignerConfigForChain<C>[];
    #signers: () => Promise<WalletSigner[]>;

    constructor(params: SignerManagerParams<C>) {
        this.#apiClient = params.apiClient;
        this.#options = params.options;
        this.#chain = params.chain;
        this.#walletAddress = params.walletAddress;
        this.#walletLocator = params.walletLocator;
        this.#serverSignerResolver = params.serverSignerResolver;
        this.#recovery = params.recovery;
        this.#initialSigners = params.initialSigners;
        this.#signers = params.signers;
        this.#activeSigner = params.signer;
    }

    get activeSigner(): SignerAdapter | undefined {
        return this.#activeSigner;
    }

    setActiveSigner(signer: SignerAdapter | undefined): void {
        this.#activeSigner = signer;
    }

    get recovery(): ResolvedRecoveryConfigForChain<C> {
        return this.#recovery;
    }

    descriptorContext(): SignerDescriptorContext<C> {
        return {
            chain: this.#chain,
            walletAddress: this.#walletAddress,
            crossmint: this.#apiClient.crossmint,
            clientTEEConnection: this.#options?.clientTEEConnection,
            resetSignerFrame: this.#options?.resetSignerFrame,
            onAuthRequired: this.#options?.callbacks?.onAuthRequired,
            deviceSignerKeyStorage: this.#options?.deviceSignerKeyStorage,
            serverSigners: this.#serverSignerResolver,
        };
    }

    adoptRecoveryConfig(config: SignerConfigForChain<C>): void {
        this.#recovery = config as RecoverySignerConfigForChain<C>;
    }

    /** Locators of the quorum members, or null when the recovery signer is not a quorum. */
    quorumMemberLocators(): string[] | null {
        if (this.#recovery.type !== "quorum") {
            return null;
        }
        return this.#recovery.signers.map(getQuorumMemberLocator);
    }

    /** Quorum members the candidate config identifies; empty when recovery is not a quorum. */
    matchQuorumMembers(candidate: { type: string } & Record<string, unknown>): ResolvedQuorumMember[] {
        if (this.#recovery.type !== "quorum") {
            return [];
        }
        return this.#recovery.signers.filter((member) =>
            matchesQuorumMember(candidate, member, (config: ServerSignerConfig) =>
                this.#serverSignerResolver.candidateAddresses(config)
            )
        );
    }

    /**
     * Replace one quorum member with the caller's merged config (API identity + runtime fields)
     * and remember the selection. The quorum-wide `adoptRecoveryConfig` must never be used for
     * members — it would overwrite the whole member set.
     */
    adoptQuorumMemberConfig(memberLocator: string, merged: ResolvedQuorumMember): void {
        if (this.#recovery.type !== "quorum") {
            return;
        }
        if (!this.#recovery.signers.some((member) => getQuorumMemberLocator(member) === memberLocator)) {
            walletsLogger.warn("signerManager.adoptQuorumMemberConfig.noSuchMember", { memberLocator });
            return;
        }
        this.#recovery = {
            ...this.#recovery,
            signers: this.#recovery.signers.map((member) =>
                getQuorumMemberLocator(member) === memberLocator ? merged : member
            ),
        };
        this.#adoptedQuorumMemberLocators.add(memberLocator);
    }

    /**
     * A quorum member the caller selected via useSigner() this session and that can be
     * reassembled without further input. Null when none — callers must then instruct the
     * user to select a member, never pick one silently.
     */
    adoptedAssemblableQuorumMember(): ResolvedQuorumMember | null {
        if (this.#recovery.type !== "quorum") {
            return null;
        }
        const context = this.descriptorContext();
        for (const member of this.#recovery.signers) {
            if (!this.#adoptedQuorumMemberLocators.has(getQuorumMemberLocator(member))) {
                continue;
            }
            const descriptor = getSignerDescriptor<C>(member.type as SignerConfigForChain<C>["type"]);
            if (descriptor.canAutoAssemble(member as SignerConfigForChain<C>, context)) {
                return member;
            }
        }
        return null;
    }

    stripSecretFromRecovery(): void {
        if (this.#recovery.type === "quorum") {
            // Per-member counterpart of the single-signer strip below: once a server member's
            // derivation is resolved (and cached in the resolver), its secret is no longer needed.
            // Only the member whose derivation is the cached one is stripped — the resolver holds
            // a single resolution, so other members' secrets must survive until they are selected.
            // Members without an API address (no-API-config fallback path) are left untouched.
            const resolvedRecoveryAddress = this.#serverSignerResolver.resolvedRecoveryAddress;
            this.#recovery = {
                ...this.#recovery,
                signers: this.#recovery.signers.map((member) =>
                    member.type === "server" &&
                    "secret" in member &&
                    member.address != null &&
                    member.address === resolvedRecoveryAddress
                        ? {
                              type: "server",
                              address: member.address,
                              ...(member.locator != null ? { locator: member.locator } : {}),
                          }
                        : member
                ),
            };
            return;
        }
        const resolvedRecoveryAddress = this.#serverSignerResolver.resolvedRecoveryAddress;
        if (
            this.#recovery != null &&
            this.#recovery.type === "server" &&
            !isApiSourcedServerSignerConfig(this.#recovery) &&
            resolvedRecoveryAddress != null
        ) {
            this.#recovery = {
                type: "server",
                address: resolvedRecoveryAddress,
            } as RecoverySignerConfigForChain<C>;
        }
    }

    async assemble(
        internalConfig: InternalSignerConfig<C>,
        options?: { isAdminSigner?: boolean }
    ): Promise<SignerAdapter> {
        const signer = assembleSigner(this.#chain, internalConfig, this.#options?.deviceSignerKeyStorage);
        if (options?.isAdminSigner) {
            // Admin signers are always approved for their wallet — skip the getSigner API call
            // which only works for delegated signers (returns 404/400 for admin signers).
            signer.status = "active";
        } else {
            const signerState = await this.getSignerState(signer.locator());
            signer.status = signerState.signer?.status;
        }
        return signer;
    }

    require(): SignerAdapter {
        if (this.#activeSigner == null) {
            if (this.#initialSigners.length > 1) {
                throw new Error(
                    "No signer is set. This wallet has multiple signers configured. " +
                        "Call wallet.useSigner() to select which signer to use before signing operations."
                );
            }
            if (this.#recovery.type === "quorum") {
                throw new Error(
                    `No signer is set. This wallet's admin signer is a quorum of [${this.#recovery.signers
                        .map(getQuorumMemberLocator)
                        .join(", ")}]. ` +
                        "Call wallet.useSigner() with the config of the quorum member you hold before signing operations."
                );
            }
            const descriptor = getSignerDescriptor<C>(this.#recovery.type);
            const typeReason = descriptor.signerUnavailableReason();
            if (typeReason != null) {
                throw new Error(typeReason);
            }
            if (!descriptor.canAutoAssemble(this.#recovery, this.descriptorContext())) {
                throw new Error(
                    "No signer is set. This wallet requires calling wallet.useSigner() before signing operations."
                );
            }
            throw new Error(
                "This wallet is read-only because no signer was provided. Operations that require signing (send, approve, addSigner, etc.) are not available."
            );
        }
        return this.#activeSigner;
    }

    async withRecoverySigner<T>(operation: () => Promise<T>): Promise<T> {
        const originalSigner = this.#activeSigner;
        if (this.#recovery.type === "quorum") {
            // A quorum has no single assemblable signer. If the active signer is a member the
            // caller selected, run the operation with it as-is — the approval loop routes its
            // signature into `quorumApprovals`. Otherwise the caller must select a member first.
            const memberLocators = this.#recovery.signers.map(getQuorumMemberLocator);
            if (originalSigner != null && memberLocators.includes(originalSigner.locator())) {
                return await operation();
            }
            throw new Error(
                `This wallet's admin signer is a quorum of [${memberLocators.join(", ")}]. ` +
                    "Call wallet.useSigner() with the config of the quorum member you hold before this operation."
            );
        }
        if (isApiSourcedServerSignerConfig(this.#recovery) && !this.#serverSignerResolver.hasRecoveryResolution) {
            throw new Error(
                "Cannot assemble server signer: no secret available. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.'
            );
        }
        const signerDescriptor = getSignerDescriptor<C>(this.#recovery.type);
        const signerDescriptorContext = this.descriptorContext();
        if (
            this.#recovery != null &&
            this.#recovery.type === "external-wallet" &&
            !signerDescriptor.canAutoAssemble(this.#recovery, signerDescriptorContext)
        ) {
            throw new Error(
                "Cannot assemble external wallet signer: no onSign callback available. " +
                    'Call wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... }) first.'
            );
        }
        const recoveryInternalConfig = signerDescriptor.buildInternalConfig(this.#recovery, signerDescriptorContext);
        this.#activeSigner = assembleSigner(this.#chain, recoveryInternalConfig, this.#options?.deviceSignerKeyStorage);

        try {
            return await operation();
        } finally {
            this.#activeSigner = originalSigner;
        }
    }

    async getSignerState(signerLocator: SignerLocator): Promise<{
        response: GetSignerResponse | null;
        signer: WalletSigner | null;
        pendingOperation: PendingSignerOperation | null;
    }> {
        let signerResponse: GetSignerResponse | null = null;
        try {
            signerResponse = await this.#apiClient.getSigner(this.#walletLocator(), signerLocator);
        } catch (error) {
            walletsLogger.warn("wallet.signers.getSignerState.fetchFailed", { signerLocator, error });
            return { response: null, signer: null, pendingOperation: null };
        }

        if (signerResponse == null || typeof signerResponse !== "object" || "error" in signerResponse) {
            walletsLogger.warn("wallet.signers.getSignerState.errorResponse", {
                signerLocator,
                response: signerResponse,
            });
            return { response: null, signer: null, pendingOperation: null };
        }

        const signer = mapApiSignerToSigner(signerResponse, this.#chain);
        return {
            response: signerResponse,
            signer,
            pendingOperation: getPendingSignerOperation(signerResponse, this.#chain),
        };
    }

    async signerIsRegistered(signerLocator: SignerLocator | string): Promise<boolean> {
        const existingSigners = await this.#signers();
        return existingSigners.some((s) => s.locator === signerLocator);
    }

    async isSignerApproved(signerLocator: SignerLocator | string): Promise<boolean> {
        const signerState = await this.getSignerState(signerLocator as SignerLocator);
        return this.isApprovedSignerStatus(signerState.signer?.status);
    }

    isApprovedSignerStatus(status: SignerStatus | undefined): boolean {
        return status === "success" || status === "active";
    }
}
