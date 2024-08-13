import { CrossmintWalletService } from "@/api/CrossmintWalletService";
import { SmartWalletChain } from "@/blockchain/chains";
import { EntryPointDetails, UserParams } from "@/types/Config";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { Address, getAddress } from "viem";

import { CrossmintServiceError, SmartWalletError } from "../../../error";
import {
    SUPPORTED_ENTRYPOINT_VERSIONS,
    SUPPORTED_KERNEL_VERSIONS,
    SupportedKernelVersion,
    isSupportedEntryPointVersion,
    isSupportedKernelVersion,
} from "../../../types/internal";
import { EOASignerConfig, PasskeySignerConfig, SignerConfig } from "./signer";

export class AccountConfigFacade {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async get(
        user: UserParams,
        chain: SmartWalletChain
    ): Promise<{
        entryPoint: EntryPointDetails;
        kernelVersion: SupportedKernelVersion;
        userId: string;
        existingSignerConfig?: SignerConfig;
        smartContractWalletAddress?: Address;
    }> {
        const { entryPointVersion, kernelVersion, signers, smartContractWalletAddress, userId } =
            await this.crossmintService.getSmartWalletConfig(user, chain);

        if (!isSupportedKernelVersion(kernelVersion)) {
            throw new SmartWalletError(
                `Unsupported kernel version. Supported versions: ${SUPPORTED_KERNEL_VERSIONS.join(
                    ", "
                )}. Version used: ${kernelVersion}, Please contact support`
            );
        }

        if (!isSupportedEntryPointVersion(entryPointVersion)) {
            throw new SmartWalletError(
                `Unsupported entry point version. Supported versions: ${SUPPORTED_ENTRYPOINT_VERSIONS.join(
                    ", "
                )}. Version used: ${entryPointVersion}. Please contact support`
            );
        }

        if (
            (entryPointVersion === "v0.7" && kernelVersion.startsWith("0.2")) ||
            (entryPointVersion === "v0.6" && kernelVersion.startsWith("0.3"))
        ) {
            throw new SmartWalletError(
                `Unsupported combination: entryPoint ${entryPointVersion} and kernel version ${kernelVersion}. Please contact support`
            );
        }

        return {
            entryPoint: {
                version: entryPointVersion,
                address: entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07,
            },
            kernelVersion,
            userId,
            existingSignerConfig: this.getSigner(signers),
            smartContractWalletAddress:
                smartContractWalletAddress != null ? getAddress(smartContractWalletAddress) : undefined,
        };
    }

    private getSigner(signers: any[]): SignerConfig | undefined {
        if (signers.length === 0) {
            return undefined;
        }

        if (signers.length > 1) {
            throw new CrossmintServiceError("Invalid wallet signer configuration. Please contact support");
        }

        const data = signers[0].signerData;

        if (data.type === "eoa") {
            return new EOASignerConfig(data);
        }

        if (data.type === "passkeys") {
            return new PasskeySignerConfig(data);
        }
    }
}
