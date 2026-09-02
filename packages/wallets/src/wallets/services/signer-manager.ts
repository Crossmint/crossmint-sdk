import { ApiClientError } from "@crossmint/common-sdk-base";

import type { ApiClient, GetSignerResponse, WalletLocator } from "../../api";
import type { Chain } from "../../chains/chains";
import { getSignerDescriptor, type SignerDescriptorContext } from "../../signers/descriptors";
import type { ServerSignerResolver } from "../../signers/server/resolver";
import { assembleSigner } from "../../signers";
import {
    isApiSourcedServerSignerConfig,
    type InternalSignerConfig,
    type RecoverySignerConfigForChain,
    type SignerAdapter,
    type SignerConfigForChain,
    type SignerLocator,
} from "../../signers/types";
import { InvalidRecoveryConfigError } from "../../utils/errors";
import { getPendingSignerOperation, mapApiSignerToSigner } from "../../utils/signer-mapping";
import { walletsLogger } from "../../logger";
import type { PendingSignerOperation, Signer as WalletSigner, SignerStatus, WalletOptions } from "../types";

export type SignerManagerParams<C extends Chain> = {
    apiClient: ApiClient;
    options: WalletOptions | undefined;
    chain: C;
    walletAddress: string;
    walletLocator: () => WalletLocator;
    serverSignerResolver: ServerSignerResolver;
    /** The wallet's recovery signers; the first entry is the primary one. Must not be empty. */
    recoverySigners: Array<RecoverySignerConfigForChain<C>>;
    initialSigners: SignerConfigForChain<C>[];
    signers: () => Promise<WalletSigner[]>;
    signer?: SignerAdapter;
};

export class SignerManager<C extends Chain> {
    #activeSigner: SignerAdapter | undefined;
    #recoverySigners: Array<RecoverySignerConfigForChain<C>>;
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
        if (params.recoverySigners.length === 0) {
            throw new InvalidRecoveryConfigError("At least one recovery signer is required");
        }
        this.#recoverySigners = [...params.recoverySigners];
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

    /** The primary recovery signer, i.e. `recoverySigners[0]`. */
    get recovery(): SignerConfigForChain<C> {
        return this.#recoverySigners[0] as SignerConfigForChain<C>;
    }

    get recoverySigners(): Array<RecoverySignerConfigForChain<C>> {
        return [...this.#recoverySigners];
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

    /** Replace the recovery signer at `index` with the caller's (typically fuller) config for the same signer. */
    adoptRecoveryConfig(index: number, config: SignerConfigForChain<C>): void {
        this.#assertRecoveryIndex(index);
        this.#recoverySigners[index] = config as RecoverySignerConfigForChain<C>;
    }

    /**
     * Replace a secret-carrying server recovery config with its address-only form, so the secret is
     * never retained (or exposed through `recoverySigners`) once the derivation has been resolved.
     */
    stripSecretFromRecovery(index: number, resolvedAddress: string): void {
        this.#assertRecoveryIndex(index);
        const recovery = this.#recoverySigners[index];
        if (recovery.type === "server" && !isApiSourcedServerSignerConfig(recovery)) {
            this.#recoverySigners[index] = {
                type: "server",
                address: resolvedAddress,
            } as RecoverySignerConfigForChain<C>;
        }
    }

    #assertRecoveryIndex(index: number): void {
        if (index < 0 || index >= this.#recoverySigners.length) {
            throw new Error(`Recovery signer index ${index} is out of range`);
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
            const recovery = this.recovery;
            const descriptor = getSignerDescriptor<C>(recovery.type);
            const typeReason = descriptor.signerUnavailableReason();
            if (typeReason != null) {
                throw new Error(typeReason);
            }
            if (!descriptor.canAutoAssemble(recovery, this.descriptorContext())) {
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
        const recovery = this.recovery;
        if (
            isApiSourcedServerSignerConfig(recovery) &&
            !this.#serverSignerResolver.hasRecoveryResolutionFor(recovery.address)
        ) {
            throw new Error(
                "Cannot assemble server signer: no secret available. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.'
            );
        }
        const signerDescriptor = getSignerDescriptor<C>(recovery.type);
        const signerDescriptorContext = this.descriptorContext();
        if (
            recovery.type === "external-wallet" &&
            !signerDescriptor.canAutoAssemble(recovery, signerDescriptorContext)
        ) {
            throw new Error(
                "Cannot assemble external wallet signer: no onSign callback available. " +
                    'Call wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... }) first.'
            );
        }
        const recoveryInternalConfig = signerDescriptor.buildInternalConfig(recovery, signerDescriptorContext);
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
        try {
            const signer = await this.#fetchSigner(signerLocator as SignerLocator);
            return this.isApprovedSignerStatus(signer?.status);
        } catch (error) {
            if (error instanceof ApiClientError && error.status === 404) {
                return false;
            }
            walletsLogger.error("wallet.signers.isSignerApproved.failed", { signerLocator, error });
            throw error;
        }
    }

    isApprovedSignerStatus(status: SignerStatus | undefined): boolean {
        return status === "success" || status === "active";
    }

    async #fetchSigner(signerLocator: SignerLocator): Promise<WalletSigner | null> {
        const signerResponse = await this.#apiClient.getSigner(this.#walletLocator(), signerLocator);
        if (signerResponse == null || typeof signerResponse !== "object" || "error" in signerResponse) {
            throw new Error(`Failed to fetch the approval state of signer ${signerLocator}`);
        }
        return mapApiSignerToSigner(signerResponse, this.#chain);
    }
}
