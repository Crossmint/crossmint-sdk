import { type SignerData, displayPasskey } from "@/types/API";
import { equalsIgnoreCase } from "@/utils/helpers";
import { type KernelSmartAccount, createKernelAccountClient } from "@zerodev/sdk";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { type HttpTransport, createPublicClient, http } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { AdminMismatchError, UserWalletAlreadyCreatedError } from "../../error";
import type { UserParams, WalletParams } from "../../types/Config";
import { SmartWalletClient, type WalletCreationParams } from "../../types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "../../utils/constants";
import { SmartWalletChain, getBundlerRPC, viemNetworks } from "../chains";
import { EVMSmartWallet } from "./EVMSmartWallet";
import { AccountConfigFacade } from "./accountConfig";
import { ClientDecorator } from "./clientDecorator";
import { EOAAccountService, type EOAWalletParams } from "./eoa";
import { PasskeyAccountService, isPasskeyParams } from "./passkey";
import { paymasterMiddleware, usePaymaster } from "./paymaster";

export class SmartWalletService {
    constructor(
        private readonly crossmintWalletService: CrossmintWalletService,
        private readonly clientDecorator: ClientDecorator,
        private readonly accountFactory: AccountBuilder,
        private readonly accountConfigFacade: AccountConfigFacade
    ) {}

    public async getOrCreate(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        const { entryPoint, kernelVersion, existingSignerConfig, smartContractWalletAddress, userId } =
            await this.accountConfigFacade.get(user, chain);

        console.log("Here's config from `getOrCreate`");
        console.log({ entryPoint, kernelVersion, existingSignerConfig, smartContractWalletAddress, userId });

        const publicClient = createPublicClient({ transport: http(getBundlerRPC(chain)) });
        const { account, signerData } = await this.accountFactory.build(
            {
                chain,
                walletParams,
                publicClient,
                user: { ...user, id: userId },
                entryPoint,
                kernelVersion,
            },
            existingSignerConfig
        );

        console.log(`Created new account: ${account.address}`);

        if (smartContractWalletAddress != null && !equalsIgnoreCase(smartContractWalletAddress, account.address)) {
            console.error(
                `Mismatch in smart contract wallet address. Expected: ${smartContractWalletAddress}, Got: ${account.address}`
            );
            throw new UserWalletAlreadyCreatedError(userId);
        }

        if (existingSignerConfig == null) {
            console.log(`No existing signer config. Creating new smart wallet.`);
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
            console.log(`Created new smart wallet: ${account.address}`);
        }

        console.log(`Creating kernel account client for account: ${account.address}`);
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

export class AccountBuilder {
    constructor(private readonly eoa: EOAAccountService, private readonly passkey: PasskeyAccountService) {}

    public build(
        params: WalletCreationParams,
        existingSignerConfig?: SignerData
    ): Promise<{
        signerData: SignerData;
        account: KernelSmartAccount<EntryPoint, HttpTransport>;
    }> {
        if (isPasskeyParams(params)) {
            if (existingSignerConfig != null && existingSignerConfig?.type !== "passkeys") {
                throw new AdminMismatchError(
                    `Cannot create wallet with passkey signer for user '${params.user.id}', they have an existing wallet with eoa signer '${existingSignerConfig.eoaAddress}.'`,
                    existingSignerConfig
                );
            }

            return this.passkey.get(params, existingSignerConfig);
        }

        if (existingSignerConfig != null && existingSignerConfig?.type !== "eoa") {
            throw new AdminMismatchError(
                `Cannot create wallet with eoa signer for user '${params.user.id}', they already have a wallet with a passkey named '${existingSignerConfig.passkeyName}' as it's signer.`,
                displayPasskey(existingSignerConfig)
            );
        }

        return this.eoa.get(params as EOAWalletParams, existingSignerConfig);
    }
}
