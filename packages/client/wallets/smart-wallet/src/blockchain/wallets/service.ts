import type { SignerData } from "@/types/API";
import { type KernelSmartAccount, createKernelAccountClient } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { type HttpTransport, createPublicClient, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { CrossmintWalletService, EVMBlockchainIncludingTestnet } from "../../api/CrossmintWalletService";
import { SmartWalletSDKError } from "../../error";
import type { EntryPointDetails, UserParams, WalletConfig } from "../../types/Config";
import {
    SUPPORTED_ENTRYPOINT_VERSIONS,
    SUPPORTED_KERNEL_VERSIONS,
    SmartWalletClient,
    type SupportedKernelVersion,
    type WalletCreationParams,
    isSupportedEntryPointVersion,
    isSupportedKernelVersion,
} from "../../types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "../../utils/constants";
import { getBundlerRPC, getViemNetwork } from "../BlockchainNetworks";
import { EVMSmartWallet } from "./EVMSmartWallet";
import { AccountClientDecorator } from "./clientDecorator";
import { type EOAWalletParams, EOAWalletService } from "./eoa";
import { PasskeyWalletService, isPasskeyParams } from "./passkey";
import { paymasterMiddleware, usePaymaster } from "./paymaster";

export class SmartWalletService {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly eoaWalletService = new EOAWalletService(),
        private readonly passkeyWalletService = new PasskeyWalletService(crossmintWalletService),
        private readonly clientDecorator = new AccountClientDecorator()
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet,
        walletConfig: WalletConfig
    ): Promise<EVMSmartWallet> {
        const { entryPoint, kernelVersion } = await this.fetchVersions(user, chain);
        const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });
        const { signerData, account } = await this.constructAccount({
            chain,
            walletConfig,
            publicClient,
            user,
            entryPoint,
            kernelVersion,
        });

        await this.crossmintWalletService.storeSmartWallet(user, {
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: account.address,
            signerData,
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: entryPoint.version,
            kernelVersion,
        });

        const kernelAccountClient: SmartWalletClient = createKernelAccountClient({
            account,
            chain: getViemNetwork(chain),
            entryPoint: account.entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(usePaymaster(chain) && paymasterMiddleware({ entryPoint: account.entryPoint, chain })),
        });

        const smartAccountClient = this.clientDecorator.decorate({
            crossmintChain: chain,
            smartAccountClient: kernelAccountClient,
        });

        return new EVMSmartWallet(this.crossmintWalletService, smartAccountClient, publicClient, chain);
    }

    private constructAccount(params: WalletCreationParams): Promise<{
        signerData: SignerData;
        account: KernelSmartAccount<EntryPoint, HttpTransport>;
    }> {
        if (isPasskeyParams(params)) {
            return this.passkeyWalletService.getAccount(params);
        }

        return this.eoaWalletService.getAccount(params as EOAWalletParams);
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
            throw new SmartWalletSDKError(
                `Unsupported kernel version. Supported versions: ${SUPPORTED_KERNEL_VERSIONS.join(
                    ", "
                )}. Version used: ${kernelVersion}, Please contact support`
            );
        }

        if (!isSupportedEntryPointVersion(entryPointVersion)) {
            throw new SmartWalletSDKError(
                `Unsupported entry point version. Supported versions: ${SUPPORTED_ENTRYPOINT_VERSIONS.join(
                    ", "
                )}. Version used: ${entryPointVersion}. Please contact support`
            );
        }

        if (entryPointVersion === "v0.7" && kernelVersion.startsWith("0.2")) {
            throw new SmartWalletSDKError(
                "Unsupported combination: entryPoint v0.7 and kernel version 0.2.x. Please contact support"
            );
        }

        if (entryPointVersion === "v0.6" && kernelVersion.startsWith("0.3")) {
            throw new SmartWalletSDKError(
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
