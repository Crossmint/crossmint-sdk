import type { SignerData } from "@/types/API";
import { type KernelSmartAccount, createKernelAccountClient } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { type HttpTransport, createPublicClient, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { CrossmintWalletService, EVMBlockchainIncludingTestnet } from "../../api/CrossmintWalletService";
import type { EntryPointDetails, UserParams, WalletParams } from "../../types/Config";
import { CrossmintServiceError, SmartWalletSDKError } from "../../types/Error";
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
import { EOAAccountService, type EOAWalletParams } from "./eoa";
import { PasskeyAccountService, isPasskeyParams } from "./passkey";
import { paymasterMiddleware, usePaymaster } from "./paymaster";
import { toCrossmintSmartAccountClient } from "./smartAccount";

export class SmartWalletService {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly accountFactory = new AccountFactory(
            new EOAAccountService(),
            new PasskeyAccountService(crossmintWalletService)
        )
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        try {
            const { entryPoint, kernelVersion, existingSignerConfig } = await this.fetchConfig(user, chain);
            const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });

            const { account, signerData } = await this.accountFactory.get(
                {
                    chain,
                    walletParams,
                    publicClient,
                    user,
                    entryPoint,
                    kernelVersion,
                },
                existingSignerConfig
            );

            if (existingSignerConfig == null) {
                await this.crossmintWalletService.storeSmartWallet(user, {
                    type: ZERO_DEV_TYPE,
                    smartContractWalletAddress: account.address,
                    signerData: signerData,
                    version: CURRENT_VERSION,
                    baseLayer: "evm",
                    chainId: blockchainToChainId(chain),
                    entryPointVersion: entryPoint.version,
                    kernelVersion,
                });
            }

            const kernelAccountClient: SmartWalletClient = createKernelAccountClient({
                account,
                chain: getViemNetwork(chain),
                entryPoint: account.entryPoint,
                bundlerTransport: http(getBundlerRPC(chain)),
                ...(usePaymaster(chain) && paymasterMiddleware({ entryPoint: account.entryPoint, chain })),
            });

            const smartAccountClient = toCrossmintSmartAccountClient({
                crossmintChain: chain,
                smartAccountClient: kernelAccountClient,
            });

            return new EVMSmartWallet(this.crossmintWalletService, smartAccountClient, publicClient, chain);
        } catch (error: any) {
            if (error.code == null) {
                throw new SmartWalletSDKError(
                    `Error creating the Wallet ${error?.message ? `: ${error.message}` : ""}`
                );
            }

            throw error;
        }
    }

    private async fetchConfig(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet
    ): Promise<{
        entryPoint: EntryPointDetails;
        kernelVersion: SupportedKernelVersion;
        existingSignerConfig?: SignerData;
    }> {
        const { entryPointVersion, kernelVersion, signers } = await this.crossmintWalletService.getSmartWalletConfig(
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
            existingSignerConfig: this.getSigner(signers),
        };
    }

    private getSigner(signers: any[]): SignerData | undefined {
        if (signers.length === 0) {
            return undefined;
        }

        if (signers.length > 1) {
            throw new CrossmintServiceError("Invalid wallet signer configuration. Please contact support");
        }

        return signers[0].signerData;
    }
}

class AccountFactory {
    constructor(private readonly eoa: EOAAccountService, private readonly passkey: PasskeyAccountService) {}

    public get(
        params: WalletCreationParams,
        existingSignerConfig?: SignerData
    ): Promise<{
        signerData: SignerData;
        account: KernelSmartAccount<EntryPoint, HttpTransport>;
    }> {
        if (isPasskeyParams(params) && existingSignerConfig?.type === "passkeys") {
            return this.passkey.get(params, existingSignerConfig);
        }

        if (existingSignerConfig?.type === "eoa") {
            return this.eoa.get(params as EOAWalletParams, existingSignerConfig);
        }

        throw new SmartWalletSDKError("Admin Mismatch");
    }
}
