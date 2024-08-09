import { equalsIgnoreCase } from "@/utils/helpers";
import { createKernelAccountClient } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPublicClient, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { UserWalletAlreadyCreatedError } from "../../error";
import type { UserParams, WalletParams } from "../../types/Config";
import type { SmartWalletClient } from "../../types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "../../utils/constants";
import type { AccountBuilder } from "../account/builder";
import type { AccountConfigFacade } from "../account/config";
import { type SmartWalletChain, getBundlerRPC, viemNetworks } from "../chains";
import { EVMSmartWallet } from "./EVMSmartWallet";
import type { ClientDecorator } from "./clientDecorator";
import { paymasterMiddleware, usePaymaster } from "./paymaster";

export class SmartWalletService {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly clientDecorator: ClientDecorator,
        private readonly accountBuilder: AccountBuilder,
        private readonly accountConfigFacade: AccountConfigFacade
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        const { entryPointVersion, kernelVersion, existingSignerConfig, smartContractWalletAddress, userId } =
            await this.accountConfigFacade.get(user, chain);

        const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });
        const { account, signerData } = await this.accountBuilder.build({
            chain,
            walletParams,
            publicClient,
            user: { ...user, id: userId },
            entryPoint: {
                version: entryPointVersion,
                address: entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07,
            },
            kernelVersion,
            existingSignerConfig,
            smartContractWalletAddress,
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
                entryPointVersion,
                kernelVersion,
            });
        }

        const kernelAccountClient: SmartWalletClient = createKernelAccountClient({
            account,
            chain: viemNetworks[chain],
            entryPoint: account.entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(usePaymaster(chain) && paymasterMiddleware({ entryPoint: account.entryPoint, chain })),
        });

        const smartAccountClient = this.clientDecorator.decorate({
            crossmintChain: chain,
            smartAccountClient: kernelAccountClient,
        });

        console.log(`Returning new EVMSmartWallet instance for account: ${account.address}`);
        return new EVMSmartWallet(this.crossmintWalletService, smartAccountClient, publicClient, chain);
    }
}
