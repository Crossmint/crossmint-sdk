import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPublicClient, http } from "viem";

import { CrossmintWalletService, EVMBlockchainIncludingTestnet } from "../../api/CrossmintWalletService";
import { EntryPointDetails, UserParams, WalletConfig } from "../../types/Config";
import { WalletSdkError } from "../../types/Error";
import {
    SUPPORTED_ENTRYPOINT_VERSIONS,
    SUPPORTED_KERNEL_VERSIONS,
    SupportedKernelVersion,
    WalletCreationParams,
} from "../../types/internal";
import { getBundlerRPC } from "../BlockchainNetworks";
import { EVMSmartWallet } from "./EVMSmartWallet";
import { EOAWalletParams, EOAWalletService } from "./eoa";
import { PasskeyWalletService, isPasskeyParams } from "./passkey";

export class SmartWalletCreator {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly eoaWalletService = new EOAWalletService(crossmintWalletService),
        private readonly passkeyWalletService = new PasskeyWalletService(crossmintWalletService)
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet,
        walletConfig: WalletConfig
    ): Promise<EVMSmartWallet> {
        try {
            const config = await this.fetchConfig(user, chain);
            const params: WalletCreationParams = {
                chain,
                walletConfig,
                publicClient: createPublicClient({ transport: http(getBundlerRPC(chain)) }),
                user,
                ...config,
            };

            if (isPasskeyParams(params)) {
                return await this.passkeyWalletService.getOrCreate(params);
            }

            return await this.eoaWalletService.getOrCreate(params as EOAWalletParams);
        } catch (error: any) {
            if (error.code == null) {
                throw new WalletSdkError(`Error creating the Wallet ${error?.message ? `: ${error.message}` : ""}`);
            }

            throw error;
        }
    }

    private async fetchConfig(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet
    ): Promise<{ entrypoint: EntryPointDetails; kernelVersion: SupportedKernelVersion }> {
        const { entryPointVersion, kernelVersion } = await this.crossmintWalletService.getSmartWalletConfig(
            user,
            chain
        );

        if (!SUPPORTED_KERNEL_VERSIONS.includes(kernelVersion)) {
            throw new Error(
                `Unsupported kernel version. Supported versions: ${SUPPORTED_KERNEL_VERSIONS.join(
                    ", "
                )}. Version used: ${kernelVersion}, Please contact support`
            );
        }

        if (!SUPPORTED_ENTRYPOINT_VERSIONS.includes(entryPointVersion)) {
            throw new Error(
                `Unsupported entry point version. Supported versions: ${SUPPORTED_ENTRYPOINT_VERSIONS.join(
                    ", "
                )}. Version used: ${entryPointVersion}, Please contact support`
            );
        }

        return {
            entrypoint: {
                version: entryPointVersion,
                address: entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07,
            },
            kernelVersion,
        };
    }
}
