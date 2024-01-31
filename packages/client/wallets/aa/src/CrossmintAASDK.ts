import { CrossmintService } from "@/api";
import { EVMAAWallet, getChainIdByBlockchain, isEVMBlockchain } from "@/blockchain";
import type { CrossmintAASDKInitParams, WalletConfig } from "@/types";
import { CURRENT_VERSION, WalletSdkError, ZERO_DEV_TYPE, createOwnerSigner, errorToJSON } from "@/utils";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";
import { createPublicClient, http } from "viem";
import { polygonMumbai } from "viem/chains";

import { BlockchainIncludingTestnet, UserIdentifierParams } from "@crossmint/common-sdk-base";

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
        walletConfig: WalletConfig
    ) {
        try {
            logInfo("[GET_OR_CREATE_WALLET] - INIT", {
                user,
                chain,
            });

            const userIdentifier = parseUserIdentifier(user);
            const owner = await createOwnerSigner(userIdentifier, chain, walletConfig, this.crossmintService);

            const address = owner.address;

            const publicClient = createPublicClient({
                chain: polygonMumbai,
                transport: http(process.env.BUNDLER_RPC),
            });
            const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
                signer: owner,
            });

            const masterAccount = await createKernelAccount(publicClient, {
                plugins: {
                    validator: ecdsaValidator,
                },
            });
            if (!isEVMBlockchain(chain)) {
                throw new WalletSdkError(`The blockchain ${chain} is still not supported`);
            }

            const evmAAWallet = new EVMAAWallet(masterAccount, this.crossmintService, chain);

            const abstractAddress = masterAccount.address;
            const { sessionKeySignerAddress } = await this.crossmintService.createSessionKey(abstractAddress);

            evmAAWallet.setSessionKeySignerAddress(sessionKeySignerAddress);

            await this.crossmintService.storeAbstractWallet({
                userIdentifier,
                type: ZERO_DEV_TYPE,
                smartContractWalletAddress: abstractAddress,
                eoaAddress: address,
                sessionKeySignerAddress,
                version: CURRENT_VERSION,
                baseLayer: "evm",
                chainId: getChainIdByBlockchain(chain),
            });
            logInfo("[GET_OR_CREATE_WALLET] - FINISH", {
                userEmail: user.email!,
                chain,
                abstractAddress,
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
}
