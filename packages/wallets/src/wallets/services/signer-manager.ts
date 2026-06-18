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
import { getPendingSignerOperation, mapApiSignerToSigner } from "../../utils/signer-mapping";
import type { PendingSignerOperation, Signer as WalletSigner, SignerStatus, WalletOptions } from "../types";

export type SignerManagerParams<C extends Chain> = {
    apiClient: ApiClient;
    options: WalletOptions | undefined;
    chain: C;
    walletAddress: string;
    walletLocator: () => WalletLocator;
    serverSignerResolver: ServerSignerResolver;
    recovery: RecoverySignerConfigForChain<C>;
    initialSigners: SignerConfigForChain<C>[];
    listSigners: () => Promise<WalletSigner[]>;
    signer?: SignerAdapter;
};

export class SignerManager<C extends Chain> {
    #active: SignerAdapter | undefined;
    #recovery: RecoverySignerConfigForChain<C>;
    #apiClient: ApiClient;
    #options: WalletOptions | undefined;
    #chain: C;
    #walletAddress: string;
    #walletLocator: () => WalletLocator;
    #serverSignerResolver: ServerSignerResolver;
    #initialSigners: SignerConfigForChain<C>[];
    #listSigners: () => Promise<WalletSigner[]>;

    constructor(params: SignerManagerParams<C>) {
        this.#apiClient = params.apiClient;
        this.#options = params.options;
        this.#chain = params.chain;
        this.#walletAddress = params.walletAddress;
        this.#walletLocator = params.walletLocator;
        this.#serverSignerResolver = params.serverSignerResolver;
        this.#recovery = params.recovery;
        this.#initialSigners = params.initialSigners;
        this.#listSigners = params.listSigners;
        this.#active = params.signer;
    }

    get active(): SignerAdapter | undefined {
        return this.#active;
    }

    setActive(signer: SignerAdapter | undefined): void {
        this.#active = signer;
    }

    get recovery(): SignerConfigForChain<C> {
        return this.#recovery as SignerConfigForChain<C>;
    }

    descriptorContext(): SignerDescriptorContext<C> {
        return {
            chain: this.#chain,
            walletAddress: this.#walletAddress,
            crossmint: this.#apiClient.crossmint,
            clientTEEConnection: this.#options?.clientTEEConnection,
            onAuthRequired: this.#options?.callbacks?.onAuthRequired,
            deviceSignerKeyStorage: this.#options?.deviceSignerKeyStorage,
            serverSigners: this.#serverSignerResolver,
        };
    }

    adoptRecoveryConfig(config: SignerConfigForChain<C>): void {
        this.#recovery = config as RecoverySignerConfigForChain<C>;
    }

    stripSecretFromRecovery(): void {
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
        if (this.#active == null) {
            if (this.#initialSigners.length > 1) {
                throw new Error(
                    "No signer is set. This wallet has multiple signers configured. " +
                        "Call wallet.useSigner() to select which signer to use before signing operations."
                );
            }
            if (this.#recovery.type === "server") {
                throw new Error(
                    "No signer is set. Server wallets require calling wallet.useSigner() with the server secret before signing operations.\n" +
                        'Example: wallet.useSigner({ type: "server", secret: process.env.YOUR_SERVER_SECRET })'
                );
            }
            if (
                this.#recovery.type === "external-wallet" ||
                !getSignerDescriptor<C>(this.#recovery.type).canAutoAssemble(this.#recovery, this.descriptorContext())
            ) {
                throw new Error(
                    "No signer is set. External wallet signers require calling wallet.useSigner() with the onSign callback before signing operations.\n" +
                        'Example: wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... })'
                );
            }
            throw new Error(
                "This wallet is read-only because no signer was provided. Operations that require signing (send, approve, addSigner, etc.) are not available."
            );
        }
        return this.#active;
    }

    async withRecoverySigner<T>(operation: () => Promise<T>): Promise<T> {
        const originalSigner = this.#active;
        if (isApiSourcedServerSignerConfig(this.#recovery) && !this.#serverSignerResolver.hasRecoveryResolution) {
            throw new Error(
                "Cannot assemble server signer: no secret available. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.'
            );
        }
        const descriptor = getSignerDescriptor<C>(this.#recovery.type);
        const ctx = this.descriptorContext();
        if (
            this.#recovery != null &&
            this.#recovery.type === "external-wallet" &&
            !descriptor.canAutoAssemble(this.#recovery, ctx)
        ) {
            throw new Error(
                "Cannot assemble external wallet signer: no onSign callback available. " +
                    'Call wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... }) first.'
            );
        }
        const recoveryInternalConfig = descriptor.buildInternalConfig(this.#recovery, ctx);
        this.#active = assembleSigner(this.#chain, recoveryInternalConfig, this.#options?.deviceSignerKeyStorage);

        try {
            return await operation();
        } finally {
            this.#active = originalSigner;
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
        } catch {
            return { response: null, signer: null, pendingOperation: null };
        }

        if (signerResponse == null || typeof signerResponse !== "object" || "error" in signerResponse) {
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
        const existingSigners = await this.#listSigners();
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
