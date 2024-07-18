import { SignerData } from "@/types/API";
import { KernelSmartAccount } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { EntryPoint } from "permissionless/types/entrypoint";
import { type HttpTransport, createPublicClient, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import { CrossmintWalletService, EVMBlockchainIncludingTestnet } from "../../api/CrossmintWalletService";
import { EntryPointDetails, UserParams, WalletConfig } from "../../types/Config";
import { WalletSdkError } from "../../types/Error";
import {
    SUPPORTED_ENTRYPOINT_VERSIONS,
    SUPPORTED_KERNEL_VERSIONS,
    SupportedKernelVersion,
    WalletCreationParams,
    isSupportedEntryPointVersion,
    isSupportedKernelVersion,
} from "../../types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "../../utils/constants";
import { getBundlerRPC } from "../BlockchainNetworks";
import { EVMSmartWallet } from "./EVMSmartWallet";
import { EOAWalletParams, EOAWalletService } from "./eoa";
import { PasskeyWalletService, isPasskeyParams } from "./passkey";

export class SmartWalletService {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly eoaWalletService = new EOAWalletService(),
        private readonly passkeyWalletService = new PasskeyWalletService(crossmintWalletService)
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet,
        walletConfig: WalletConfig
    ): Promise<EVMSmartWallet> {
        try {
            const { entryPoint, kernelVersion } = await this.fetchVersions(user, chain);
            const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });
            const params: WalletCreationParams = {
                chain,
                walletConfig,
                publicClient,
                user,
                entryPoint,
                kernelVersion,
            };

            const { signerData, account } = await this.constructAccount(params);
            await this.crossmintWalletService.storeSmartWallet(user, {
                type: ZERO_DEV_TYPE,
                smartContractWalletAddress: account.address,
                signerData: signerData,
                version: CURRENT_VERSION,
                baseLayer: "evm",
                chainId: blockchainToChainId(chain),
                entryPointVersion: entryPoint.version,
                kernelVersion: kernelVersion,
            });

            return new EVMSmartWallet(this.crossmintWalletService, account, publicClient, chain);
        } catch (error: any) {
            if (error.code == null) {
                throw new WalletSdkError(`Error creating the Wallet ${error?.message ? `: ${error.message}` : ""}`);
            }

            throw error;
        }
    }

    private constructAccount(params: WalletCreationParams): Promise<{
        signerData: SignerData;
        account: KernelSmartAccount<EntryPoint, HttpTransport>;
    }> {
        if (isPasskeyParams(params)) {
            return this.passkeyWalletService.getAccountAndSigner(params);
        } else {
            return this.eoaWalletService.getAccountAndSigner(params as EOAWalletParams);
        }
    }

    private async fetchVersions(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet
    ): Promise<{ entryPoint: EntryPointDetails; kernelVersion: SupportedKernelVersion }> {
        const { entryPointVersion, kernelVersion } = await this.crossmintWalletService.getSmartWalletConfig(
            user,
            chain
        );

        if (!isSupportedKernelVersion(kernelVersion)) {
            throw new Error(
                `Unsupported kernel version. Supported versions: ${SUPPORTED_KERNEL_VERSIONS.join(
                    ", "
                )}. Version used: ${kernelVersion}, Please contact support`
            );
        }

        if (!isSupportedEntryPointVersion(entryPointVersion)) {
            throw new Error(
                `Unsupported entry point version. Supported versions: ${SUPPORTED_ENTRYPOINT_VERSIONS.join(
                    ", "
                )}. Version used: ${entryPointVersion}. Please contact support`
            );
        }

        if (entryPointVersion === "v0.7" && kernelVersion.startsWith("0.2")) {
            throw new Error(
                "Unsupported combination: entryPoint v0.7 and kernel version 0.2.x. Please contact support"
            );
        }

        if (entryPointVersion === "v0.6" && kernelVersion.startsWith("0.3")) {
            throw new Error(
                "Unsupported combination: entryPoint v0.6 and kernel version 0.3.x. Please contact support"
            );
        }

        return {
            entryPoint: {
                version: entryPointVersion,
                address: entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07,
            },
            kernelVersion,
        };
    }
}
