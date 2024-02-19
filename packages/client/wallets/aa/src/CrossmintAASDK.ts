import { CrossmintWalletService } from "@/api";
import { EVMAAWallet, getChainIdByBlockchain, getZeroDevProjectIdByBlockchain, isEVMBlockchain } from "@/blockchain";
import { CrossmintPasskeyCommunicationService } from "@/passkeys/services/CrossmintPasskeyCommunicationService";
import type { CrossmintAASDKInitParams, WalletConfig } from "@/types";
import {
    CURRENT_VERSION,
    WalletSdkError,
    ZERO_DEV_TYPE,
    createOwnerSigner,
    errorToJSON,
    isFireblocksNCWSigner,
} from "@/utils";
import { ZeroDevEthersProvider } from "@zerodev/sdk";

import { BlockchainIncludingTestnet, UserIdentifierParams, validateAPIKey } from "@crossmint/common-sdk-base";

import { logError, logInfo } from "./services/logging";
import { parseUserIdentifier } from "./utils/user";

export class CrossmintAASDK {
    crossmintService: CrossmintWalletService;
    private readonly projectId: string;

    private constructor(config: CrossmintAASDKInitParams) {
        const validationResult = validateAPIKey(config.apiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }

        this.projectId = validationResult.projectId;
        this.crossmintService = new CrossmintWalletService(config.apiKey);
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
            let isCreate = true;

            if (isFireblocksNCWSigner(walletConfig.signer) && walletConfig.signer.passphrase == null) {
                // I assume that this is a recovery and that I have to get the passphrase from somewhere
                isCreate = false;
                const passphrase = await new CrossmintPasskeyCommunicationService(
                    this.crossmintService
                ).getAndDecryptPassphrase(user, chain);
                walletConfig.signer.passphrase = passphrase;
            }

            const userIdentifier = parseUserIdentifier(user);

            const owner = await createOwnerSigner({
                userIdentifier,
                projectId: this.projectId,
                chain,
                walletConfig,
                crossmintService: this.crossmintService,
            });

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

            const abstractAddress = await evmAAWallet.getAddress();
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

            if (isFireblocksNCWSigner(walletConfig.signer) && walletConfig.signer.passphrase && isCreate) {
                await new CrossmintPasskeyCommunicationService(this.crossmintService).encryptPassphrase(
                    address,
                    chain,
                    walletConfig.signer.passphrase
                );
            }

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
