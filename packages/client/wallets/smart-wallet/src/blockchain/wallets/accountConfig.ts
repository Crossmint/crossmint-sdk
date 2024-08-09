import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { Address, getAddress } from "viem";

import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { SmartWalletError } from "../../error";
import { SignerData } from "../../types/API";
import { EntryPointDetails, UserParams } from "../../types/Config";
import {
    SUPPORTED_ENTRYPOINT_VERSIONS,
    SUPPORTED_KERNEL_VERSIONS,
    SupportedKernelVersion,
    isSupportedEntryPointVersion,
    isSupportedKernelVersion,
} from "../../types/internal";
import { SmartWalletChain } from "../chains";

type AccountConfig = {
    entryPointVersion: string;
    kernelVersion: string;
    userId: string;
    existingSignerConfig?: SignerData;
    smartContractWalletAddress?: Address;
};

export class AccountConfigFacade {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly cache: AccountConfigCache
    ) {}

    public async get(
        user: UserParams,
        chain: SmartWalletChain
    ): Promise<{
        entryPoint: EntryPointDetails;
        kernelVersion: SupportedKernelVersion;
        userId: string;
        existingSignerConfig?: SignerData;
        smartContractWalletAddress?: Address;
    }> {
        const config = this.cache.get() ?? (await this.crossmintWalletService.getSmartWalletConfig(user, chain));
        const { entryPointVersion, kernelVersion, existingSignerConfig, smartContractWalletAddress, userId } = config;

        console.log("Here's config in AccountConfigFacade");
        console.log(config);

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
            userId, // not validated
            existingSignerConfig, // not validated
            smartContractWalletAddress:
                smartContractWalletAddress != null ? getAddress(smartContractWalletAddress) : undefined,
        };
    }
}

export class AccountConfigCache {
    private KEY = "cm-smart-wallet-config";

    set(config: AccountConfig) {
        const cookieData = JSON.stringify(config);
        document.cookie = `${this.KEY}=${encodeURIComponent(cookieData)}; path=/;`;
    }

    get(): AccountConfig | null {
        const cookieValue = document.cookie.split("; ").find((row) => row.startsWith(this.KEY));

        if (cookieValue == null) {
            return null;
        }

        console.log("Returning cached smart wallet config");
        return JSON.parse(decodeURIComponent(cookieValue.split("=")[1]));
    }
}
