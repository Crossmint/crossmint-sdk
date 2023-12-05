import { CrossmintService } from "@/api";
import { Blockchain, EVMAAWallet, EVMBlockchain, FireblocksNCWallet } from "@/blockchain";
import type { CrossmintAASDKInitParams, FireblocksNCWSigner, UserIdentifier, WalletConfig } from "@/types";
import { CURRENT_VERSION, WalletSdkError, ZERO_DEV_TYPE, ZERO_PROJECT_ID } from "@/utils";
import type { SmartAccountSigner } from "@alchemy/aa-core";
import { ZeroDevEthersProvider, convertEthersSignerToAccountSigner } from "@zerodev/sdk";
import { Signer } from "ethers";

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
        walletConfig: WalletConfig
    ) {
        try {
            let owner: SmartAccountSigner;
            if ((walletConfig.signer as FireblocksNCWSigner)?.type === "FIREBLOCKS_NCW") {
                const passphrase = (walletConfig.signer as FireblocksNCWSigner).passphrase;
                const fireblocks = await FireblocksNCWallet(user.email, this.crossmintService, chain, passphrase);
                owner = fireblocks.owner;
            } else {
                owner = convertEthersSignerToAccountSigner(walletConfig.signer as Signer);
            }

            const address = await owner.getAddress();

            const zDevProvider = await ZeroDevEthersProvider.init("ECDSA", {
                projectId: ZERO_PROJECT_ID,
                owner,
                opts: {
                    paymasterConfig: {
                        policy: "VERIFYING_PAYMASTER",
                    },
                },
            });

            this.crossmintService.setCrossmintUrl(chain);
            const evmAAWallet = new EVMAAWallet(zDevProvider, this.crossmintService, chain as EVMBlockchain);

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
            });

            return evmAAWallet;
        } catch (e) {
            throw new WalletSdkError(
                `Error creating the Wallet [${e instanceof Error ? `${e.name}. ${e.message}` : e}]`
            );
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
