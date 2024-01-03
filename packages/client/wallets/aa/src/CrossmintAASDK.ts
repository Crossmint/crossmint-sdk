import { CrossmintService } from "@/api";
import {
    Blockchain,
    EVMAAWallet,
    getChainIdByBlockchain,
    getZeroDevProjectIdByBlockchain,
    isEVMBlockchain,
} from "@/blockchain";
import type { CrossmintAASDKInitParams, UserIdentifier, WalletCallback, WalletConfig } from "@/types";
import { CURRENT_VERSION, WalletSdkError, ZERO_DEV_TYPE, createOwnerSigner, errorToJSON } from "@/utils";
import { ZeroDevEthersProvider } from "@zerodev/sdk";

import { logError, logInfo } from "./services/logging";

export class CrossmintAASDK {
    crossmintService: CrossmintService;

    private constructor(config: CrossmintAASDKInitParams) {
        this.crossmintService = new CrossmintService(config.clientSecret, config.projectId);
    }

    static init(params: CrossmintAASDKInitParams): CrossmintAASDK {
        return new CrossmintAASDK(params);
    }

    async getOrCreateWallet<B extends Blockchain = Blockchain>(
        user: UserIdentifier,
        chain: B,
        walletConfig: WalletConfig,
        callback?: WalletCallback
    ) {
        try {
            logInfo("[GET_OR_CREATE_WALLET] - INIT", {
                userEmail: user.email!,
                chain,
            });
            this.crossmintService.setCrossmintUrl(chain);
            const owner = await createOwnerSigner(user, chain, walletConfig, this.crossmintService);

            const address = await owner.getAddress();

            const zDevProvider = await ZeroDevEthersProvider.init("ECDSA", {
                projectId: getZeroDevProjectIdByBlockchain(chain),
                owner,
                opts: {
                    paymasterConfig: {
                        policy: "VERIFYING_PAYMASTER",
                    },
                },
            });

            if (!isEVMBlockchain(chain)) {
                throw new WalletSdkError(`The blockchain ${chain} is still not supported`);
            }

            const evmAAWallet = new EVMAAWallet(zDevProvider, this.crossmintService, chain);
            if (callback) {
                callback(evmAAWallet);
            }

            const abstractAddress = await evmAAWallet.getAddress();
            const { sessionKeySignerAddress } = await this.crossmintService.createSessionKey(abstractAddress);

            evmAAWallet.setSessionKeySignerAddress(sessionKeySignerAddress);

            await this.crossmintService.storeAbstractWallet({
                userEmail: user.email!,
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
                userEmail: user.email!,
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
