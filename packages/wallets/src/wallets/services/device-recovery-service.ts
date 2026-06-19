import type { Chain } from "../../chains/chains";
import { assembleSigner } from "../../signers";
import { getSignerDescriptor } from "../../signers/descriptors";
import type { ServerSignerResolver } from "../../signers/server/resolver";
import {
    AuthRejectedError,
    type DeviceSignerConfig,
    type InternalSignerConfig,
    isApiSourcedServerSignerConfig,
    OtpValidationError,
    type SignerAdapter,
    type SignerConfigForChain,
    type SignerLocator,
} from "../../signers/types";
import { DeviceSignerNotSupportedError } from "../../utils/errors";
import { createDeviceSigner } from "@/utils/device-signers";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";
import { walletsLogger } from "../../logger";
import type { PendingSignerOperation, Signer as WalletSigner, WalletOptions } from "../types";
import type { SignerManager } from "./signer-manager";

export type DeviceSignerState = "unknown" | "needs-recovery" | "resolved";

export type DeviceRecoveryServiceParams<C extends Chain> = {
    chain: C;
    walletAddress: string;
    options: WalletOptions | undefined;
    signerManager: SignerManager<C>;
    serverSignerResolver: ServerSignerResolver;
    signers: () => Promise<WalletSigner[]>;
    addSigner: (signer: SignerConfigForChain<C>) => Promise<unknown>;
    approveSignature: (signatureId: string) => Promise<unknown>;
    approveTransaction: (transactionId: string) => Promise<unknown>;
};

export class DeviceRecoveryService<C extends Chain> {
    #status: DeviceSignerState = "unknown";
    // Sticky latch: a previous recover() learned from the backend (DEVICE_SIGNER_NOT_SUPPORTED)
    // that this wallet's provider does not support device signers. Orthogonal to #status — it can
    // coexist with both "needs-recovery" and "resolved", so it is not a #status kind.
    #providerRejectedDeviceSigners = false;

    #chain: C;
    #walletAddress: string;
    #options: WalletOptions | undefined;
    #signerManager: SignerManager<C>;
    #serverSignerResolver: ServerSignerResolver;
    #signers: () => Promise<WalletSigner[]>;
    #addSigner: (signer: SignerConfigForChain<C>) => Promise<unknown>;
    #approveSignature: (signatureId: string) => Promise<unknown>;
    #approveTransaction: (transactionId: string) => Promise<unknown>;

    constructor(params: DeviceRecoveryServiceParams<C>) {
        this.#chain = params.chain;
        this.#walletAddress = params.walletAddress;
        this.#options = params.options;
        this.#signerManager = params.signerManager;
        this.#serverSignerResolver = params.serverSignerResolver;
        this.#signers = params.signers;
        this.#addSigner = params.addSigner;
        this.#approveSignature = params.approveSignature;
        this.#approveTransaction = params.approveTransaction;
    }

    get needsRecovery(): boolean {
        return this.#status === "needs-recovery";
    }

    onSignerSelected(): void {
        if (this.#status === "needs-recovery") {
            this.#status = "unknown";
        }
    }

    async initDeviceSigner(): Promise<void> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            return;
        }
        if (this.#providerRejectedDeviceSigners) {
            return;
        }

        const deviceConfig: DeviceSignerConfig = { type: "device" };
        try {
            await this.resolveAvailability(deviceConfig);
        } catch (error) {
            walletsLogger.error("wallet.initDeviceSigner.error", { error });
            this.#status = "needs-recovery";
            return;
        }

        if (this.#status === "needs-recovery") {
            return;
        }

        const internalConfig = getSignerDescriptor<C>(deviceConfig.type).buildInternalConfig(
            deviceConfig as SignerConfigForChain<C>,
            this.#signerManager.descriptorContext()
        );
        const deviceSigner = await this.#signerManager.assemble(internalConfig);
        this.#signerManager.setActiveSigner(deviceSigner);

        if (!this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.initDeviceSigner.pendingApproval", {
                signerLocator: deviceSigner.locator(),
                status: deviceSigner.status,
            });
            this.#status = "needs-recovery";
        }
    }

    async recover(): Promise<void> {
        walletsLogger.info("wallet.recover.start");

        if (this.#status === "resolved") {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved (cached)" });
            return;
        }

        if (this.#providerRejectedDeviceSigners) {
            walletsLogger.info("wallet.recover.skipped", { reason: "device signer not supported (cached)" });
            this.#status = "resolved";
            return;
        }

        const activeSigner = this.#signerManager.activeSigner;
        if (activeSigner?.type === "device") {
            if (await this.#checkAndResumeDeviceSigner(activeSigner)) {
                this.#status = "resolved";
                return;
            }
        }

        if (activeSigner != null && activeSigner.type !== "device") {
            walletsLogger.warn("wallet.recover.skipped", { reason: "Recovery is only supported for device signers" });
            this.#status = "unknown";
            return;
        }

        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            if (this.#status !== "needs-recovery") {
                return;
            }
            throw new Error("Device signer key storage is required to recover a device signer");
        }

        const matchedSigner = await this.#findLocalDeviceSigner(deviceSignerKeyStorage);
        if (matchedSigner != null) {
            if (await this.#checkAndResumeDeviceSigner(matchedSigner)) {
                this.#signerManager.setActiveSigner(matchedSigner);
                this.#status = "resolved";
                const publicKeyBase64 = matchedSigner.locator().replace("device:", "");
                try {
                    await deviceSignerKeyStorage.mapAddressToKey(this.#walletAddress, publicKeyBase64);
                } catch (error) {
                    walletsLogger.warn("wallet.recover.mapAddressToKey.error", { error });
                }
                return;
            }
        }

        const newDeviceSigner = await createDeviceSigner(deviceSignerKeyStorage, this.#walletAddress);

        try {
            await this.#addSigner(newDeviceSigner as SignerConfigForChain<C>);
        } catch (error) {
            if (error instanceof DeviceSignerNotSupportedError) {
                walletsLogger.info("wallet.recover.device.unsupportedFallback", {
                    signerLocator: newDeviceSigner.locator,
                });
                await deviceSignerKeyStorage.deleteKey(this.#walletAddress);
                this.#providerRejectedDeviceSigners = true;
                this.#status = "resolved";
                await this.#assembleRecoverySignerFallback();
                return;
            } else if (isAlreadyApprovedSignerError(error)) {
                walletsLogger.info("wallet.recover.skipped", {
                    reason: "Device signer already approved",
                    signerLocator: newDeviceSigner.locator,
                });
            } else if (
                error instanceof AuthRejectedError ||
                (error instanceof Error && error.name === "AuthRejectedError")
            ) {
                walletsLogger.info("wallet.recover.device.authRejected", { signerLocator: newDeviceSigner.locator });
                throw error;
            } else if (
                error instanceof OtpValidationError ||
                (error instanceof Error && error.name === "OtpValidationError")
            ) {
                walletsLogger.warn("wallet.recover.device.otpValidationFailed", {
                    signerLocator: newDeviceSigner.locator,
                    code: error instanceof OtpValidationError ? error.code : undefined,
                });
                throw error;
            } else {
                walletsLogger.error("wallet.recover.device.error", { error });
                await deviceSignerKeyStorage.deleteKey(this.#walletAddress);
                throw error;
            }
        }

        const reassembledSigner = await this.#signerManager.assemble({
            type: "device",
            locator: newDeviceSigner.locator as SignerLocator,
            address: this.#walletAddress,
        } as InternalSignerConfig<C>);
        this.#signerManager.setActiveSigner(reassembledSigner);
        if (reassembledSigner.type === "device") {
            reassembledSigner.status = "success";
        }
        walletsLogger.info("wallet.recover.device.success", { signerLocator: newDeviceSigner.locator });

        this.#status = "resolved";
    }

    async resolveAvailability(config: DeviceSignerConfig): Promise<void> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            throw new Error("Device signer key storage is required for device signers");
        }

        const existingKey = await deviceSignerKeyStorage.getKey(this.#walletAddress);
        if (existingKey != null) {
            config.locator = `device:${existingKey}`;
            return;
        }

        const existingSigners = await this.#signers();
        const deviceSigners = existingSigners.filter((s) => s.locator.startsWith("device:"));
        for (const walletSigner of deviceSigners) {
            const publicKeyBase64 = walletSigner.locator.replace("device:", "");
            const hasKey = await deviceSignerKeyStorage.hasKey(publicKeyBase64);
            if (hasKey) {
                await deviceSignerKeyStorage.mapAddressToKey(this.#walletAddress, publicKeyBase64);
                config.locator = walletSigner.locator;
                return;
            }
        }

        this.#status = "needs-recovery";
    }

    async #checkAndResumeDeviceSigner(deviceSigner: SignerAdapter): Promise<boolean> {
        if (this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved" });
            return true;
        }

        const signerState = await this.#signerManager.getSignerState(deviceSigner.locator());
        deviceSigner.status = signerState.signer?.status;

        if (signerState.pendingOperation != null) {
            await this.#resumePendingDeviceSignerApproval(deviceSigner, signerState.pendingOperation);
            return true;
        }

        if (this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved" });
            return true;
        }

        return false;
    }

    async #resumePendingDeviceSignerApproval(
        deviceSigner: SignerAdapter,
        pendingOperation: PendingSignerOperation
    ): Promise<void> {
        const originalSigner = this.#signerManager.activeSigner;
        const recovery = this.#signerManager.recovery;
        if (isApiSourcedServerSignerConfig(recovery) && !this.#serverSignerResolver.hasRecoveryResolution) {
            throw new Error(
                "Cannot resume pending approval: no secret available. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.'
            );
        }
        const signerDescriptor = getSignerDescriptor<C>(recovery.type);
        const signerDescriptorContext = this.#signerManager.descriptorContext();
        if (
            recovery != null &&
            recovery.type === "external-wallet" &&
            !signerDescriptor.canAutoAssemble(recovery, signerDescriptorContext)
        ) {
            throw new Error(
                "Cannot resume pending approval: no onSign callback available. " +
                    'Call wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... }) first.'
            );
        }
        const recoveryInternalConfig = signerDescriptor.buildInternalConfig(recovery, signerDescriptorContext);
        this.#signerManager.setActiveSigner(
            assembleSigner(this.#chain, recoveryInternalConfig, this.#options?.deviceSignerKeyStorage)
        );

        try {
            if (pendingOperation.type === "signature") {
                await this.#approveSignature(pendingOperation.id);
            } else {
                await this.#approveTransaction(pendingOperation.id);
            }
        } catch (error) {
            this.#signerManager.setActiveSigner(deviceSigner);
            throw error;
        } finally {
            if (this.#signerManager.activeSigner !== deviceSigner) {
                this.#signerManager.setActiveSigner(originalSigner);
            }
        }
        deviceSigner.status = "success";
        walletsLogger.info("wallet.recover.device.success", {
            signerLocator: deviceSigner.locator(),
            resumed: true,
        });
    }

    async #findLocalDeviceSigner(deviceSignerKeyStorage: DeviceSignerKeyStorage): Promise<SignerAdapter | null> {
        const existingSigners = await this.#signers();
        const deviceSigners = existingSigners.filter((s) => s.locator.startsWith("device:"));

        for (const walletSigner of deviceSigners) {
            const publicKeyBase64 = walletSigner.locator.replace("device:", "");
            try {
                const hasKey = await deviceSignerKeyStorage.hasKey(publicKeyBase64);
                if (hasKey) {
                    const signer = assembleSigner(
                        this.#chain,
                        {
                            type: "device",
                            locator: walletSigner.locator as SignerLocator,
                            address: this.#walletAddress,
                        } as InternalSignerConfig<C>,
                        deviceSignerKeyStorage
                    );
                    walletsLogger.info("wallet.recover.foundLocalDeviceSigner", {
                        signerLocator: walletSigner.locator,
                    });
                    return signer;
                }
            } catch (error) {
                walletsLogger.warn("wallet.recover.findLocalDeviceSigner.keyCheckError", {
                    signerLocator: walletSigner.locator,
                    error,
                });
            }
        }
        return null;
    }

    async #assembleRecoverySignerFallback(): Promise<void> {
        const recovery = this.#signerManager.recovery;
        const signerDescriptor = getSignerDescriptor<C>(recovery.type);
        const signerDescriptorContext = this.#signerManager.descriptorContext();
        if (!signerDescriptor.canAutoAssemble(recovery, signerDescriptorContext)) {
            return;
        }
        try {
            const internalConfig = signerDescriptor.buildInternalConfig(recovery, signerDescriptorContext);
            this.#signerManager.setActiveSigner(
                await this.#signerManager.assemble(internalConfig, { isAdminSigner: true })
            );
        } catch (error) {
            walletsLogger.warn("wallet.recover.device.unsupportedFallback.autoAssemblyFailed", {
                recoveryType: recovery.type,
                error,
            });
        }
    }
}

// TODO: replace with a stable backend error code instead of message string matching.
function isAlreadyApprovedSignerError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }
    const message = error.message.toLowerCase();
    return message.includes("delegated signer") && message.includes("already") && message.includes("approved");
}
