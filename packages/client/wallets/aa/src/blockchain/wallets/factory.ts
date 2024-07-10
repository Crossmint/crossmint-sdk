import { KERNEL_V3_VERSION_TYPE } from "@zerodev/sdk/_types/types/kernel";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPublicClient, http } from "viem";

import { CrossmintWalletService, EVMBlockchainIncludingTestnet } from "../../api/CrossmintWalletService";
import { EntryPointDetails, UserParams, WalletConfig } from "../../types/Config";
import { WalletSdkError } from "../../types/Error";
import { WalletCreationParams } from "../../types/internal";
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
    ): Promise<{ entrypoint: EntryPointDetails; kernelVersion: KERNEL_V3_VERSION_TYPE }> {
        console.debug(`Fetching smart wallet config for user: ${JSON.stringify(user)}, chain: ${chain}`);
        const { entryPointVersion, kernelVersion } = await this.crossmintWalletService.getSmartWalletConfig(
            user,
            chain
        );
        console.debug(
            `Received smart wallet config: entryPointVersion=${entryPointVersion}, kernelVersion=${kernelVersion}`
        );

        if (!["0.3.0", "0.3.1"].includes(kernelVersion)) {
            console.error(`Unsupported kernel version: ${kernelVersion}`);
            throw new Error("Unsupported kernel version");
        }

        const entrypointAddress = entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07;
        console.debug(
            `Determined entrypoint address: ${entrypointAddress} for entryPointVersion: ${entryPointVersion}`
        );

        return {
            entrypoint: {
                version: entryPointVersion,
                address: entrypointAddress,
            },
            kernelVersion,
        };
    }
}
