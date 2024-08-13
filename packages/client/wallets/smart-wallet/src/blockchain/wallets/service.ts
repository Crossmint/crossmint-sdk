import { SignerData } from "@/types/API";
import { equalsIgnoreCase } from "@/utils/helpers";
import { type KernelSmartAccount, createKernelAccountClient } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { Address, type HttpTransport, createPublicClient, getAddress, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import {
    AdminMismatchError,
    ConfigError,
    CrossmintServiceError,
    SmartWalletError,
    UserWalletAlreadyCreatedError,
} from "../../error";
import type { EntryPointDetails, UserParams, WalletParams } from "../../types/Config";
import {
    SUPPORTED_ENTRYPOINT_VERSIONS,
    SUPPORTED_KERNEL_VERSIONS,
    SmartWalletClient,
    type SupportedKernelVersion,
    type WalletCreationParams,
    isEOACreationParams,
    isPasskeyCreationParams,
    isSupportedEntryPointVersion,
    isSupportedKernelVersion,
} from "../../types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "../../utils/constants";
import { SmartWalletChain, getBundlerRPC, viemNetworks } from "../chains";
import { EVMSmartWallet } from "./EVMSmartWallet";
import { EOASignerConfig, PasskeySignerConfig, SignerConfig } from "./account/signer";
import { ClientDecorator } from "./clientDecorator";
import { EOAAccountService } from "./eoa";
import { PasskeyAccountService } from "./passkey";
import { paymasterMiddleware, usePaymaster } from "./paymaster";

export class SmartWalletService {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly clientDecorator: ClientDecorator,
        private readonly accountFactory = new AccountFactory(
            new EOAAccountService(),
            new PasskeyAccountService(crossmintWalletService)
        )
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        const { entryPoint, kernelVersion, existingSignerConfig, smartContractWalletAddress, userId } =
            await this.fetchConfig(user, chain);
        const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });

        const { account, signerData } = await this.accountFactory.get({
            chain,
            walletParams,
            publicClient,
            user: { ...user, id: userId },
            entryPoint,
            kernelVersion,
            existingSignerConfig,
        });

        if (smartContractWalletAddress != null && !equalsIgnoreCase(smartContractWalletAddress, account.address)) {
            throw new UserWalletAlreadyCreatedError(userId);
        }

        if (existingSignerConfig == null) {
            await this.crossmintWalletService.idempotentCreateSmartWallet(user, {
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
            chain: viemNetworks[chain],
            entryPoint: account.entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(usePaymaster(chain) &&
                paymasterMiddleware({
                    entryPoint: account.entryPoint,
                    chain,
                    walletService: this.crossmintWalletService,
                    user,
                })),
        });

        const smartAccountClient = this.clientDecorator.decorate({
            crossmintChain: chain,
            smartAccountClient: kernelAccountClient,
        });

        return new EVMSmartWallet(this.crossmintWalletService, smartAccountClient, publicClient, chain);
    }

    private async fetchConfig(
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
            await this.crossmintWalletService.getSmartWalletConfig(user, chain);

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

class AccountFactory {
    constructor(private readonly eoa: EOAAccountService, private readonly passkey: PasskeyAccountService) {}

    public get(params: WalletCreationParams): Promise<{
        signerData: SignerData;
        account: KernelSmartAccount<EntryPoint, HttpTransport>;
    }> {
        if (isPasskeyCreationParams(params)) {
            return this.passkey.get(params);
        }

        if (isEOACreationParams(params)) {
            return this.eoa.get(params);
        }

        if (params.existingSignerConfig == null) {
            throw new ConfigError("Unsupported signer type");
        }

        const signerDisplay = params.existingSignerConfig.display();
        throw new AdminMismatchError(
            `Cannot create wallet with ${params.existingSignerConfig.type} signer for user ${params.user.id}', they already have a wallet with signer:\n'${signerDisplay}'`,
            signerDisplay
        );
    }
}
