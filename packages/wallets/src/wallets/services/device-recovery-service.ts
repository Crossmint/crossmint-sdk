import type { Chain } from "../../chains/chains";
import { assembleSigner, tryAssembleLocalDeviceSigner } from "../../signers";
import { getSignerDescriptor } from "../../signers/descriptors";
import type { ServerSignerResolver } from "../../signers/server/resolver";
import {
    AuthRejectedError,
    type DeviceSignerConfig,
    type InternalSignerConfig,
    isApiSourcedServerSignerConfig,
    type QuorumLocator,
    OtpValidationError,
    SignerAuthenticationError,
    type SignerAdapter,
    type SignerConfigForChain,
    type SignerLocator,
} from "../../signers/types";
import { DeviceSignerNotSupportedError, SignerLimitExceededError, WalletNotAvailableError } from "../../utils/errors";
import { createDeviceSigner } from "@/utils/device-signers";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";
import { walletsLogger } from "../../logger";
import type { Signer as APISigner } from "../../api";
import { mapApiSignerToSigner, pendingOperationId } from "../../utils/signer-mapping";
import type { PendingSignerOperation, RecoverResult, Signer as WalletSigner, WalletOptions } from "../types";
import type { SignerManager } from "./signer-manager";

export type DeviceSignerState = "unknown" | "needs-recovery" | "resolved";

type DeviceWalletSigner = Extract<WalletSigner, { type: "device" }>;

/** What a signer change returned: `status` "success" once it landed, else the request it waits on. */
type SignerChange = { status?: unknown; transactionId?: string; signatureId?: string } | undefined;

/** Where a device signer's registration stands: approved, waiting on quorum members, or neither. */
type DeviceRegistration =
    | { state: "approved" }
    | { state: "awaiting"; request: NonNullable<RecoverResult> }
    | { state: "none" };

export type DeviceRecoveryServiceParams<C extends Chain> = {
    chain: C;
    walletAddress: string;
    options: WalletOptions | undefined;
    signerManager: SignerManager<C>;
    serverSignerResolver: ServerSignerResolver;
    signers: () => Promise<WalletSigner[]>;
    addSigner: (signer: SignerConfigForChain<C>) => Promise<SignerChange>;
    /** `approver` names the quorum that approves the removal; without it the removal's approver is resolved as usual. */
    removeSigner: (signerLocator: string, approver?: QuorumLocator) => Promise<SignerChange>;
    approveSignature: (signatureId: string) => Promise<unknown>;
    approveTransaction: (transactionId: string) => Promise<unknown>;
    deviceSignerActivity: () => Promise<Map<string, number>>;
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
    #addSigner: (signer: SignerConfigForChain<C>) => Promise<SignerChange>;
    #removeSigner: (signerLocator: string, approver?: QuorumLocator) => Promise<SignerChange>;
    #approveSignature: (signatureId: string) => Promise<unknown>;
    #approveTransaction: (transactionId: string) => Promise<unknown>;
    #deviceSignerActivity: () => Promise<Map<string, number>>;

    constructor(params: DeviceRecoveryServiceParams<C>) {
        this.#chain = params.chain;
        this.#walletAddress = params.walletAddress;
        this.#options = params.options;
        this.#signerManager = params.signerManager;
        this.#serverSignerResolver = params.serverSignerResolver;
        this.#signers = params.signers;
        this.#addSigner = params.addSigner;
        this.#removeSigner = params.removeSigner;
        this.#approveSignature = params.approveSignature;
        this.#approveTransaction = params.approveTransaction;
        this.#deviceSignerActivity = params.deviceSignerActivity;
    }

    get needsRecovery(): boolean {
        return this.#status === "needs-recovery";
    }

    onSignerSelected(): void {
        if (this.#status === "needs-recovery") {
            this.#status = "unknown";
        }
    }

    /**
     * @param apiSigners - Delegated signers as the API just returned them with the wallet. When given, the
     * device signer is matched and its status read from them, with no request to the API.
     */
    async initDeviceSigner(apiSigners?: APISigner[]): Promise<void> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            return;
        }
        if (this.#providerRejectedDeviceSigners) {
            return;
        }

        const deviceConfig: DeviceSignerConfig = { type: "device" };
        try {
            await this.resolveAvailability(deviceConfig, apiSigners);
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
        const deviceSigner = await this.#signerManager.assemble(internalConfig, { apiSigners });
        this.#signerManager.setActiveSigner(deviceSigner);

        if (!this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.initDeviceSigner.pendingApproval", {
                signerLocator: deviceSigner.locator(),
                status: deviceSigner.status,
            });
            this.#status = "needs-recovery";
            return;
        }
        // A quorum-approved device replacing a saved one leaves it for recover(), which removes it through that quorum.
        if (await this.#replacesSavedSignerThroughQuorum(deviceSignerKeyStorage, deviceSigner.locator())) {
            return;
        }
        await this.#saveSignerLocator(deviceSignerKeyStorage, deviceSigner.locator());
    }

    async #replacesSavedSignerThroughQuorum(
        deviceSignerKeyStorage: DeviceSignerKeyStorage,
        signerLocator: SignerLocator
    ): Promise<boolean> {
        const savedLocator = await this.#getSavedSignerLocator(deviceSignerKeyStorage);
        if (savedLocator == null || savedLocator === signerLocator) {
            return false;
        }
        const { approvingQuorum } = await this.#signerManager.getSignerState(signerLocator);
        return approvingQuorum != null;
    }

    async recover(): Promise<RecoverResult> {
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
            const registration = await this.#checkAndResumeDeviceSigner(activeSigner);
            if (registration.state === "approved") {
                this.#status = "resolved";
                return await this.#replaceSavedSignerLocator(activeSigner.locator());
            }
            if (registration.state === "awaiting") {
                this.#status = "needs-recovery";
                return registration.request;
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

        const existingSigners = await this.#signers();
        const matchedSigner = await this.#findLocalDeviceSigner(deviceSignerKeyStorage, existingSigners);
        if (matchedSigner != null) {
            const registration = await this.#checkAndResumeDeviceSigner(matchedSigner);
            if (registration.state === "approved") {
                this.#signerManager.setActiveSigner(matchedSigner);
                this.#status = "resolved";
                const staleRemoval = await this.#replaceSavedSignerLocator(matchedSigner.locator());
                const publicKeyBase64 = matchedSigner.locator().replace("device:", "");
                try {
                    await deviceSignerKeyStorage.mapAddressToKey(this.#walletAddress, publicKeyBase64);
                } catch (error) {
                    walletsLogger.warn("wallet.recover.mapAddressToKey.error", { error });
                }
                return staleRemoval;
            }
            if (registration.state === "awaiting") {
                this.#signerManager.setActiveSigner(matchedSigner);
                this.#status = "needs-recovery";
                return registration.request;
            }
        }

        const existingDeviceSigners = existingSigners.filter((s) => s.type === "device");
        // Resolves the approver as resolveApprover will (the member's quorum, else a recovery method), for its error only:
        // no key is created when no approver can be resolved.
        this.#signerManager.approvesAsQuorum();
        const newDeviceSigner = await createDeviceSigner(deviceSignerKeyStorage, this.#walletAddress);
        let staleDeviceSignerLocator = await this.#findSavedStaleSignerLocator(
            deviceSignerKeyStorage,
            existingDeviceSigners,
            newDeviceSigner.locator
        );

        let awaitedRegistration: RecoverResult;
        try {
            ({ staleDeviceSignerLocator, awaitedRegistration } = await this.#registerDeviceSigner(
                newDeviceSigner,
                existingDeviceSigners,
                staleDeviceSignerLocator
            ));
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
                error instanceof SignerAuthenticationError ||
                (error instanceof Error && error.name === "SignerAuthenticationError")
            ) {
                walletsLogger.warn("wallet.recover.device.authenticationFailed", {
                    signerLocator: newDeviceSigner.locator,
                    code: error instanceof SignerAuthenticationError ? error.code : undefined,
                });
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
            } else if (error instanceof SignerLimitExceededError) {
                walletsLogger.warn("wallet.recover.device.signerLimitExceeded", {
                    signerLocator: newDeviceSigner.locator,
                });
                throw error;
            } else {
                walletsLogger.error("wallet.recover.device.error", { error });
                if (!(await this.#registrationAwaitsQuorum(newDeviceSigner.locator as SignerLocator))) {
                    await deviceSignerKeyStorage.deleteKey(this.#walletAddress);
                }
                throw error;
            }
        }

        const reassembledSigner = await this.#signerManager.assemble({
            type: "device",
            locator: newDeviceSigner.locator as SignerLocator,
            address: this.#walletAddress,
        } as InternalSignerConfig<C>);
        this.#signerManager.setActiveSigner(reassembledSigner);
        // Quorum members approve the new device signer later; until it lands it stays pending and the old one stays.
        if (awaitedRegistration != null) {
            this.#status = "needs-recovery";
            walletsLogger.info("wallet.recover.device.awaitingApproval", {
                signerLocator: newDeviceSigner.locator,
                ...awaitedRegistration,
            });
            return awaitedRegistration;
        }
        if (reassembledSigner.type === "device") {
            reassembledSigner.status = "success";
        }
        walletsLogger.info("wallet.recover.device.success", { signerLocator: newDeviceSigner.locator });

        this.#status = "resolved";
        await this.#saveSignerLocator(deviceSignerKeyStorage, newDeviceSigner.locator as SignerLocator);

        if (staleDeviceSignerLocator != null) {
            return await this.#removeStaleSigner(staleDeviceSignerLocator, null);
        }
        return undefined;
    }

    // Whether a signer change made now would wait on quorum members; an approver that cannot be resolved counts as one,
    // as nothing flat could sign it either.
    #changeApprovedByQuorum(): boolean {
        try {
            return this.#signerManager.approvesAsQuorum();
        } catch {
            return true;
        }
    }

    // Quorum members may still approve a registration that exists, so deleting its key would strand it. A flat
    // approver's registration is made again with a new key, as before quorums.
    async #registrationAwaitsQuorum(signerLocator: SignerLocator): Promise<boolean> {
        if (!this.#changeApprovedByQuorum()) {
            return false;
        }
        const registered = await this.#signerManager.getSignerState(signerLocator);
        return registered.signer != null || registered.lookupFailed;
    }

    async #registerDeviceSigner(
        newDeviceSigner: DeviceSignerConfig,
        existingDeviceSigners: DeviceWalletSigner[],
        staleDeviceSignerLocator: string | undefined
    ): Promise<{ staleDeviceSignerLocator: string | undefined; awaitedRegistration: RecoverResult }> {
        try {
            const change = await this.#addSigner(newDeviceSigner as SignerConfigForChain<C>);
            return { staleDeviceSignerLocator, awaitedRegistration: awaitedRequest(change) };
        } catch (error) {
            // Through a quorum, the removal would wait on its members and the next add would hit the limit again.
            if (!(error instanceof SignerLimitExceededError) || this.#changeApprovedByQuorum()) {
                throw error;
            }
            const signerLocatorToRemove =
                staleDeviceSignerLocator ??
                (await this.#findLeastRecentlyActiveDeviceSigner(existingDeviceSigners, newDeviceSigner.locator));
            if (signerLocatorToRemove == null) {
                throw error;
            }
            walletsLogger.info("wallet.recover.signerLimitReached", { signerLocator: signerLocatorToRemove });
            await this.#removeSigner(signerLocatorToRemove).catch((removeError) => {
                walletsLogger.warn("wallet.recover.staleSignerRemovalFailed", {
                    signerLocator: signerLocatorToRemove,
                    error: removeError,
                });
                throw error;
            });
            walletsLogger.info("wallet.recover.staleSignerRemoved", { signerLocator: signerLocatorToRemove });
            const change = await this.#addSigner(newDeviceSigner as SignerConfigForChain<C>);
            return { staleDeviceSignerLocator: undefined, awaitedRegistration: awaitedRequest(change) };
        }
    }

    async #findSavedStaleSignerLocator(
        deviceSignerKeyStorage: DeviceSignerKeyStorage,
        existingDeviceSigners: DeviceWalletSigner[],
        newDeviceSignerLocator: string | undefined
    ): Promise<string | undefined> {
        const savedLocator = await this.#getSavedSignerLocator(deviceSignerKeyStorage);
        if (savedLocator == null || savedLocator === newDeviceSignerLocator) {
            return undefined;
        }
        return existingDeviceSigners.some((s) => s.locator === savedLocator) ? savedLocator : undefined;
    }

    async #findLeastRecentlyActiveDeviceSigner(
        existingDeviceSigners: DeviceWalletSigner[],
        newDeviceSignerLocator: string | undefined
    ): Promise<string | undefined> {
        const candidates = existingDeviceSigners.filter((s) => s.locator !== newDeviceSignerLocator);
        if (candidates.length === 0) {
            return undefined;
        }
        let activity: Map<string, number>;
        try {
            activity = await this.#deviceSignerActivity();
        } catch (error) {
            walletsLogger.warn("wallet.recover.deviceSignerActivity.error", { error });
            return undefined;
        }
        const lastActive = (signer: DeviceWalletSigner) => activity.get(signer.locator) ?? 0;
        return candidates.reduce((oldest, signer) => (lastActive(signer) < lastActive(oldest) ? signer : oldest))
            .locator;
    }

    // Saves the active device's locator and removes the previously saved device; returns that removal when quorum
    // members still have to approve it.
    async #replaceSavedSignerLocator(signerLocator: string): Promise<RecoverResult> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            return undefined;
        }
        let staleRemoval: RecoverResult;
        const savedLocator = await this.#getSavedSignerLocator(deviceSignerKeyStorage);
        if (savedLocator != null && savedLocator !== signerLocator) {
            let existingSigners: WalletSigner[];
            try {
                existingSigners = await this.#signers();
            } catch (error) {
                walletsLogger.warn("wallet.recover.staleSignerLookupFailed", { signerLocator: savedLocator, error });
                return undefined;
            }
            if (existingSigners.some((s) => s.type === "device" && s.locator === savedLocator)) {
                const { approvingQuorum } = await this.#signerManager.getSignerState(signerLocator as SignerLocator);
                staleRemoval = await this.#removeStaleSigner(savedLocator, approvingQuorum);
            }
        }
        await this.#saveSignerLocator(deviceSignerKeyStorage, signerLocator);
        return staleRemoval;
    }

    // The removal goes through the quorum that approved the new device signer, when known, so it needs no selection.
    async #removeStaleSigner(signerLocator: string, approvingQuorum: QuorumLocator | null): Promise<RecoverResult> {
        try {
            const removal = awaitedRequest(await this.#removeStaleSignerChange(signerLocator, approvingQuorum));
            if (removal == null) {
                walletsLogger.info("wallet.recover.staleSignerRemoved", { signerLocator });
                return undefined;
            }
            walletsLogger.info("wallet.recover.staleSignerRemovalPending", { signerLocator, ...removal });
            return removal;
        } catch (error) {
            walletsLogger.warn("wallet.recover.staleSignerRemovalFailed", { signerLocator, error });
            return undefined;
        }
    }

    #removeStaleSignerChange(signerLocator: string, approvingQuorum: QuorumLocator | null): Promise<SignerChange> {
        if (approvingQuorum == null) {
            return this.#removeSigner(signerLocator);
        }
        return this.#removeSigner(signerLocator, approvingQuorum);
    }

    async #getSavedSignerLocator(deviceSignerKeyStorage: DeviceSignerKeyStorage): Promise<string | null> {
        try {
            return await deviceSignerKeyStorage.getSavedSignerLocator(this.#walletAddress);
        } catch (error) {
            walletsLogger.warn("wallet.recover.getSavedSignerLocator.error", { error });
            return null;
        }
    }

    async #saveSignerLocator(deviceSignerKeyStorage: DeviceSignerKeyStorage, signerLocator: string): Promise<void> {
        try {
            await deviceSignerKeyStorage.saveSignerLocator(this.#walletAddress, signerLocator);
        } catch (error) {
            walletsLogger.warn("wallet.recover.saveSignerLocator.error", { error });
        }
    }

    async resolveAvailability(config: DeviceSignerConfig, apiSigners?: APISigner[]): Promise<void> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            throw new Error("Device signer key storage is required for device signers");
        }

        const existingKey = await deviceSignerKeyStorage.getKey(this.#walletAddress);
        if (existingKey != null) {
            config.locator = `device:${existingKey}`;
            this.#status = "unknown";
            return;
        }

        // Same filter as signers(): only signers with an approval on this chain.
        const existingSigners =
            apiSigners != null
                ? apiSigners.filter((s) => mapApiSignerToSigner(s, this.#chain) != null)
                : await this.#signers();
        const deviceSigners = existingSigners.filter((s) => s.locator.startsWith("device:"));
        for (const walletSigner of deviceSigners) {
            const publicKeyBase64 = walletSigner.locator.replace("device:", "");
            const hasKey = await deviceSignerKeyStorage.hasKey(publicKeyBase64);
            if (hasKey) {
                await deviceSignerKeyStorage.mapAddressToKey(this.#walletAddress, publicKeyBase64);
                config.locator = walletSigner.locator;
                this.#status = "unknown";
                return;
            }
        }

        this.#status = "needs-recovery";
    }

    async #checkAndResumeDeviceSigner(deviceSigner: SignerAdapter): Promise<DeviceRegistration> {
        if (this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved" });
            return { state: "approved" };
        }

        const signerState = await this.#signerManager.getSignerState(deviceSigner.locator());
        // Registering again could start a second request while the first waits on quorum members; flat wallets go on.
        // With no approver resolved, this throws as registering would.
        if (signerState.lookupFailed && this.#signerManager.approvesAsQuorum()) {
            throw new WalletNotAvailableError(`Could not read device signer ${deviceSigner.locator()}; try again`);
        }
        deviceSigner.status = signerState.signer?.status;

        if (signerState.pendingOperation != null) {
            // Quorum members approve it with approve(), as with prepareOnly (EDD 007 §7): nothing is signed here.
            if (signerState.approvingQuorum != null) {
                return { state: "awaiting", request: pendingOperationId(signerState.pendingOperation) };
            }
            await this.#resumePendingDeviceSignerApproval(deviceSigner, signerState.pendingOperation);
            return { state: "approved" };
        }

        if (this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved" });
            return { state: "approved" };
        }

        return { state: "none" };
    }

    async #resumePendingDeviceSignerApproval(
        deviceSigner: SignerAdapter,
        pendingOperation: PendingSignerOperation
    ): Promise<void> {
        const originalSigner = this.#signerManager.activeSigner;
        // No recovery method signs alone: the approver must be chosen, as for any signer change (for the error only).
        if (this.#signerManager.defaultRecovery == null) {
            this.#signerManager.resolveAuthorizingRecovery();
        }
        const recovery = this.#signerManager.requireDefaultRecovery();
        if (
            isApiSourcedServerSignerConfig(recovery) &&
            !this.#serverSignerResolver.hasRecoveryResolutionFor(recovery.address)
        ) {
            throw new Error(
                "Cannot resume pending approval: no secret available. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.'
            );
        }
        const signerDescriptor = getSignerDescriptor<C>(recovery.type);
        const signerDescriptorContext = this.#signerManager.descriptorContext();
        if (
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

    async #findLocalDeviceSigner(
        deviceSignerKeyStorage: DeviceSignerKeyStorage,
        existingSigners: WalletSigner[]
    ): Promise<SignerAdapter | null> {
        const deviceSigners = existingSigners.filter((s) => s.locator.startsWith("device:"));

        for (const walletSigner of deviceSigners) {
            const signer = await this.tryResolveLocallyAvailableSigner(walletSigner.locator, deviceSignerKeyStorage);
            if (signer != null) {
                walletsLogger.info("wallet.recover.foundLocalDeviceSigner", { signerLocator: walletSigner.locator });
                return signer;
            }
        }
        return null;
    }

    async tryResolveLocallyAvailableSigner(
        locator: string,
        deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage
    ): Promise<SignerAdapter | null> {
        if (deviceSignerKeyStorage == null) {
            return null;
        }
        try {
            return await tryAssembleLocalDeviceSigner(
                this.#chain,
                locator,
                this.#walletAddress,
                deviceSignerKeyStorage
            );
        } catch (error) {
            walletsLogger.warn("wallet.deviceRecovery.tryResolveLocallyAvailableSigner.failed", {
                signerLocator: locator,
                error,
            });
            return null;
        }
    }

    async #assembleRecoverySignerFallback(): Promise<void> {
        const recovery = this.#signerManager.defaultRecovery;
        if (recovery == null) {
            return;
        }
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

// The request a signer change still waits on, or undefined once it landed.
function awaitedRequest(change: SignerChange): RecoverResult {
    if (change == null || change.status === "success") {
        return undefined;
    }
    if (change.signatureId != null) {
        return { signatureId: change.signatureId };
    }
    if (change.transactionId != null) {
        return { transactionId: change.transactionId };
    }
    return undefined;
}

// TODO: replace with a stable backend error code instead of message string matching.
function isAlreadyApprovedSignerError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }
    const message = error.message.toLowerCase();
    return message.includes("delegated signer") && message.includes("already") && message.includes("approved");
}
