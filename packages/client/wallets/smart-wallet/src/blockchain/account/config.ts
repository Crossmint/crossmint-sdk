import { getAddress } from "viem";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { SmartWalletError } from "../../error";
import type { UserParams } from "../../types/Config";
import {
    type AccountConfig,
    SUPPORTED_ENTRYPOINT_VERSIONS,
    SUPPORTED_KERNEL_VERSIONS,
    isSupportedEntryPointVersion,
    isSupportedKernelVersion,
} from "../../types/internal";
import type { SmartWalletChain } from "../chains";

export class AccountConfigFacade {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly cache: AccountConfigCache
    ) {}

    public async get(user: UserParams, chain: SmartWalletChain): Promise<AccountConfig> {
        const config = this.cache.get() ?? (await this.crossmintWalletService.getSmartWalletConfig(user, chain));
        const { entryPointVersion, kernelVersion, existingSignerConfig, smartContractWalletAddress, userId } = config;

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
            entryPointVersion,
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
        console.log("Setting cookie data");

        const cookieData = JSON.stringify(config);
        document.cookie = `${this.KEY}=${encodeURIComponent(cookieData)}; path=/;`;
    }

    get(): any | null {
        // TODO treat as unknown and validate better
        const cookieValue = document.cookie.split("; ").find((row) => row.startsWith(this.KEY));

        if (cookieValue == null) {
            return null;
        }

        const test = JSON.parse(decodeURIComponent(cookieValue.split("=")[1]));
        console.log("Returning cached smart wallet config");
        console.log(test);
        return test;
    }
}
