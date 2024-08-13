import { equalsIgnoreCase } from "@/utils/helpers";
import { createKernelAccountClient } from "@zerodev/sdk";
import { createPublicClient, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { UserWalletAlreadyCreatedError } from "../../error";
import type { UserParams, WalletParams } from "../../types/Config";
import { SmartWalletClient } from "../../types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "../../utils/constants";
import { SmartWalletChain, getBundlerRPC, viemNetworks } from "../chains";
import { EVMSmartWallet } from "./EVMSmartWallet";
import { AccountConfigFacade } from "./account/config";
import { AccountCreator } from "./account/creator";
import type { ClientDecorator } from "./clientDecorator";
import { EOAAccountService } from "./eoa";
import { PasskeyAccountService } from "./passkey";
import { paymasterMiddleware, usePaymaster } from "./paymaster";

export class SmartWalletService {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly clientDecorator: ClientDecorator,
        private readonly accountFactory = new AccountCreator(
            new EOAAccountService(),
            new PasskeyAccountService(crossmintWalletService)
        ),
        private readonly accountConfigFacade = new AccountConfigFacade(crossmintWalletService)
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        const { entryPoint, kernelVersion, existingSignerConfig, smartContractWalletAddress, userId } =
            await this.accountConfigFacade.get(user, chain);
        const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });

        const { account, signerConfig } = await this.accountFactory.get({
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
                signerData: signerConfig.data,
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
}
