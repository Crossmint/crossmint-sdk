import { KernelSmartAccount } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07, createSmartAccountClient } from "permissionless";
import { createPimlicoBundlerClient } from "permissionless/clients/pimlico";
import { EntryPoint } from "permissionless/types/entrypoint";
import { HttpTransport, createPublicClient, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import type { SmartWalletClient } from "../../types/internal";
import type { UserParams, WalletParams } from "../../types/params";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "../../utils/constants";
import { type SmartWalletChain, viemNetworks } from "../chains";
import { getAlchemyRPC, getPimlicoBundlerRPC } from "../rpc";
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

        const publicClient = createPublicClient({ transport: http(getAlchemyRPC(chain)) });

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

        return new EVMSmartWallet(
            { wallet: this.smartAccountClient(chain, account, user), public: publicClient },
            chain,
            this.crossmintService
        );
    }

    private smartAccountClient(
        chain: SmartWalletChain,
        account: KernelSmartAccount<EntryPoint, HttpTransport>,
        user: UserParams
    ): SmartWalletClient {
        const transport = http(getPimlicoBundlerRPC(chain));
        const bundlerConfig = { chain: viemNetworks[chain], entryPoint: account.entryPoint };
        const bundlerClient = createPimlicoBundlerClient({ ...bundlerConfig, transport });
        const smartAccountClient: SmartWalletClient = createSmartAccountClient({
            account,
            bundlerTransport: transport,
            ...bundlerConfig,
            ...(usePaymaster(chain) &&
                paymasterMiddleware({
                    bundlerClient,
                    entryPoint: account.entryPoint,
                    chain,
                    walletService: this.crossmintService,
                    user,
                })),
        });

        return this.clientDecorator.decorate({
            crossmintChain: chain,
            smartAccountClient,
        });
    }
}
