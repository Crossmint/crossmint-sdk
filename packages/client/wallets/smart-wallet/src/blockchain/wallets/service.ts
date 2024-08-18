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
import { AccountConfigCache } from "./account/cache";
import type { AccountConfigFacade } from "./account/config";
import type { AccountCreator } from "./account/creator";
import type { ClientDecorator } from "./clientDecorator";
import { paymasterMiddleware, usePaymaster } from "./paymaster";

export class SmartWalletService {
    constructor(
        private readonly crossmintService: CrossmintWalletService,
        private readonly accountConfigFacade: AccountConfigFacade,
        private readonly accountCreator: AccountCreator,
        private readonly clientDecorator: ClientDecorator,
        private readonly accountConfigCache: AccountConfigCache
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        const config = await this.accountConfigFacade.get(user, chain);
        const { entryPointVersion, kernelVersion, existing, userId } = config;
        const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });

        const { account, signerConfig } = await this.accountCreator.get({
            chain,
            walletParams,
            publicClient,
            user: { ...user, id: userId },
            entryPoint: entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07,
            kernelVersion,
            existing,
        });

        if (existing != null && !equalsIgnoreCase(existing.address, account.address)) {
            throw new UserWalletAlreadyCreatedError(userId);
        }

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

        // TODO doesn't feel like the right spot.
        this.accountConfigCache.set(user, {
            ...config,
            signers: [{ signerData: signerConfig.data }],
            smartContractWalletAddress: account.address,
        });

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
