import { createKernelAccountClient } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPublicClient, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { UserWalletAlreadyCreatedError } from "../../error";
import type { SmartWalletClient } from "../../types/internal";
import type { UserParams, WalletParams } from "../../types/params";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "../../utils/constants";
import { equalsIgnoreCase } from "../../utils/helpers";
import { type SmartWalletChain, getBundlerRPC, viemNetworks } from "../chains";
import { EVMSmartWallet } from "./EVMSmartWallet";
import type { AccountConfigService } from "./account/config";
import type { AccountCreator } from "./account/creator";
import type { ClientDecorator } from "./clientDecorator";
import { paymasterMiddleware, usePaymaster } from "./paymaster";

export class SmartWalletService {
    constructor(
        private readonly crossmintService: CrossmintWalletService,
        private readonly accountConfigService: AccountConfigService,
        private readonly accountCreator: AccountCreator,
        private readonly clientDecorator: ClientDecorator
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        const {
            config: { entryPointVersion, kernelVersion, existing, userWithId },
            cached,
        } = await this.accountConfigService.get(user, chain);

        const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });

        const { account, signerConfig } = await this.accountCreator.get({
            chain,
            walletParams,
            publicClient,
            user: userWithId,
            entryPoint: entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07,
            kernelVersion,
            existing,
        });

        if (existing == null) {
            await this.crossmintService.idempotentCreateSmartWallet(user, {
                type: ZERO_DEV_TYPE,
                smartContractWalletAddress: account.address,
                signerData: signerConfig.data,
                version: CURRENT_VERSION,
                baseLayer: "evm",
                chainId: blockchainToChainId(chain),
                entryPointVersion,
                kernelVersion,
            });
        }

        if (!cached) {
            this.accountConfigService.cache({
                entryPointVersion,
                kernelVersion,
                user: userWithId,
                existing: { address: account.address, signerConfig },
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
                    walletService: this.crossmintService,
                    user,
                })),
        });

        const smartAccountClient = this.clientDecorator.decorate({
            crossmintChain: chain,
            smartAccountClient: kernelAccountClient,
        });

        return new EVMSmartWallet(this.crossmintService, smartAccountClient, publicClient, chain);
    }
}
