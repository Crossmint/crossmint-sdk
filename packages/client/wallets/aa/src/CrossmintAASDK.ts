import { CrossmintService } from "@/api";
import { EVMAAWallet, getChainIdByBlockchain, getZeroDevProjectIdByBlockchain, isEVMBlockchain } from "@/blockchain";
import type { CrossmintAASDKInitParams, SignerType, WalletConfig } from "@/types";
import { CURRENT_VERSION, WalletSdkError, ZERO_DEV_TYPE, createOwnerSigner, errorToJSON } from "@/utils";
import type { SmartAccountSigner } from "@alchemy/aa-core";
import { createEcdsaKernelAccountClient } from "@zerodev/presets/zerodev";
import { ZeroDevEthersProvider } from "@zerodev/sdk-legacy";
import { polygonMumbai } from "viem/chains";

import {
    BlockchainIncludingTestnet,
    EVMBlockchainIncludingTestnet,
    UserIdentifier,
    UserIdentifierParams,
} from "@crossmint/common-sdk-base";

import { EVMAAWalletViem } from "./blockchain/wallets/EVMAAWalletViem";
import { logError, logInfo } from "./services/logging";
import { parseUserIdentifier } from "./utils/user";

export class CrossmintAASDK {
    crossmintService: CrossmintService;

    private constructor(config: CrossmintAASDKInitParams) {
        this.crossmintService = new CrossmintService(config.apiKey);
    }

    static init(params: CrossmintAASDKInitParams): CrossmintAASDK {
        return new CrossmintAASDK(params);
    }

    async getOrCreateWallet<B extends BlockchainIncludingTestnet = BlockchainIncludingTestnet>(
        user: UserIdentifierParams,
        chain: B,
        walletConfig: WalletConfig,
        signerType?: SignerType
    ) {
        try {
            logInfo("[GET_OR_CREATE_WALLET] - INIT", {
                user,
                chain,
            });

            if (!isEVMBlockchain(chain)) {
                throw new WalletSdkError(`The blockchain ${chain} is still not supported`);
            }

            const userIdentifier = parseUserIdentifier(user);
            const owner = await createOwnerSigner(
                userIdentifier,
                chain,
                walletConfig,
                this.crossmintService,
                signerType
            );
            let evmAAWallet;
            if (signerType === "viem") {
                evmAAWallet = await this.handleViemSigner(userIdentifier, chain, owner);
            } else {
                evmAAWallet = await this.handleEthersSigner(userIdentifier, chain, owner);
            }
            logInfo("[GET_OR_CREATE_WALLET] - FINISH", {
                userEmail: user.email!,
                chain,
                abstractAddress: await evmAAWallet.getAddress(),
            });
            return evmAAWallet;
        } catch (error: any) {
            logError("[GET_OR_CREATE_WALLET] - ERROR_CREATING_WALLET", {
                error: errorToJSON(error),
                user,
                chain,
            });

            throw new WalletSdkError(`Error creating the Wallet [${error?.name ?? ""}]`);
        }
    }

    /**
     * Clears all key material and state from device storage, related to all wallets stored. Call this method when the user signs out of your app, if you don't have a user identifier.
     */
    async purgeAllWalletData(): Promise<void> {
        //Removes the Fireblocks NCW data stored on the localstorage
        const keys = Object.keys(localStorage);
        const keysToDelete = keys.filter((key) => key.startsWith("NCW-"));
        keysToDelete.forEach((key) => {
            localStorage.removeItem(key);
        });
    }

    private async initializeEthersSigner<B extends BlockchainIncludingTestnet>(owner: SmartAccountSigner, chain: B) {
        const zDevProvider = await ZeroDevEthersProvider.init("ECDSA", {
            projectId: getZeroDevProjectIdByBlockchain(chain),
            owner,
            opts: {
                paymasterConfig: {
                    policy: "VERIFYING_PAYMASTER",
                },
            },
        });

        return { zDevProvider };
    }

    private async initializeViemSigner<B extends BlockchainIncludingTestnet>(owner: any, chain: B) {
        const kernelClient = await createEcdsaKernelAccountClient({
            projectId: process.env.ZERODEV_PROJECT_ID!,
            chain: polygonMumbai,
            signer: owner,
        });

        return kernelClient;
    }

    private async storeAbstractWallet<B extends BlockchainIncludingTestnet>(
        userIdentifier: UserIdentifier,
        chain: B,
        abstractAddress: string,
        address: `0x${string}`,
        sessionKeySignerAddress: `0x${string}`
    ) {
        await this.crossmintService.storeAbstractWallet({
            userIdentifier,
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: abstractAddress,
            eoaAddress: address!,
            sessionKeySignerAddress,
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: getChainIdByBlockchain(chain),
        });
    }

    private async handleViemSigner<B extends EVMBlockchainIncludingTestnet = EVMBlockchainIncludingTestnet>(
        userIdentifier: UserIdentifier,
        chain: B,
        owner: SmartAccountSigner
    ): Promise<EVMAAWalletViem> {
        const kernelClient = await this.initializeViemSigner(owner, chain);
        const address = await owner.getAddress();
        const evmAAWallet = new EVMAAWalletViem(kernelClient, chain, this.crossmintService, owner);
        const abstractAddress = await evmAAWallet.getAddress();
        const { sessionKeySignerAddress } = await this.crossmintService.createSessionKey(abstractAddress);
        evmAAWallet.setSessionKeySignerAddress(sessionKeySignerAddress);
        await this.storeAbstractWallet(userIdentifier, chain, abstractAddress, address, sessionKeySignerAddress);
        return evmAAWallet;
    }

    private async handleEthersSigner<B extends EVMBlockchainIncludingTestnet = EVMBlockchainIncludingTestnet>(
        userIdentifier: UserIdentifier,
        chain: B,
        owner: SmartAccountSigner
    ): Promise<EVMAAWallet> {
        const address = await owner.getAddress();
        const { zDevProvider } = await this.initializeEthersSigner(owner, chain);
        const evmAAWallet = new EVMAAWallet(zDevProvider!, this.crossmintService, chain);
        const abstractAddress = await evmAAWallet.getAddress();
        const { sessionKeySignerAddress } = await this.crossmintService.createSessionKey(abstractAddress);
        evmAAWallet.setSessionKeySignerAddress(sessionKeySignerAddress);
        await this.storeAbstractWallet(userIdentifier, chain, abstractAddress, address, sessionKeySignerAddress);
        return evmAAWallet;
    }
}
