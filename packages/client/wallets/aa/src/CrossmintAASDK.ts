import { CrossmintWalletService } from "@/api";
import { EVMAAWallet, getChainIdByBlockchain, getZeroDevProjectIdByBlockchain, isEVMBlockchain } from "@/blockchain";
import type { CrossmintAASDKInitParams, WalletConfig } from "@/types";
import { CURRENT_VERSION, WalletSdkError, ZERO_DEV_TYPE, createOwnerSigner, errorToJSON, isFireblocksNCWSigner } from "@/utils";
import { ZeroDevEthersProvider } from "@zerodev/sdk";

import { BLOCKCHAIN_INCLUDING_TESTNET, BlockchainIncludingTestnet, UserIdentifier, UserIdentifierParams, validateAPIKey } from "@crossmint/common-sdk-base";

import { logError, logInfo } from "./services/logging";
import { parseUserIdentifier } from "./utils/user";
import { z } from 'zod';
import { PasskeysSDK } from "./passkeys/PasskeysSDK";

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
            let isCreate = true
            const passkeysSDK = PasskeysSDK.init({
                // replace with API call from this PR: https://github.com/Paella-Labs/crossbit-main/pull/11361
                apiKey: "sk_development_5zjHWgh88253PZC6X1Bxbdj6JcfQLt4ZYaPLzvKuqjf4EA6BmuuK1YNuwKDJND6mGYHYKptEiWSRCTLcYKbjUq5XErj4atLDdbjqdAAEk7zSeJ2uWiCZrFdnJwLoJixGthNxXWrpFahnB6SmdX2zd4p4n5ubhBHEqvbGv2zaKs8wP1uFiGqkM6vwpj7uJ37hKcWTLfNc3XLwM4eragcpHu2S",
            });


            console.log('encrypting ...')
            const enc = await passkeysSDK.encrypt(chain, '0x17096bfA4A98C0503564Ace6Cd55BF3D1f31453c', '1234');
            debugger
            if (isFireblocksNCWSigner(walletConfig.signer) && walletConfig.signer.passphrase == null) {
                // I assume that this is a recovery and that I have to get the passphrase from somewhere
                isCreate = false
                const passphrase = await this.giveMeThePassPhraseWithPassKeys(user, chain)
                walletConfig.signer.passphrase = passphrase
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
                abriOtraVentanaYpasaleLaData(address, chain, walletConfig.signer.passphrase);
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


    async giveMeThePassPhraseWithPassKeys(user: UserIdentifierParams, chain: BlockchainIncludingTestnet) {
        const { eoaAddress } = await this.crossmintService.getEOAAddress(user, chain)
        const newW = window.open("https://7d62-2800-810-458-1608-44d0-8a84-dbbb-575f.ngrok-free.app/passkeys", "_blank");

        try {
            try {
                setTimeout(() => {
                    newW!.postMessage({ walletAddress: eoaAddress, chain, action: 'decrypt', type: 'passkeysAction' }, "https://7d62-2800-810-458-1608-44d0-8a84-dbbb-575f.ngrok-free.app/passkeys")
                }, 5000)
            } catch (error) {
                console.log(error)
            }


            return new Promise<string>((resolve, reject) => {
                console.log('we are waiting for the passphrase')
                window.addEventListener("message", (event) => {
                    if (event.data.passphrase == null) return
                    console.log('we got the passphrase', event.data)
                    // if (event.origin !== "https://7d62-2800-810-458-1608-44d0-8a84-dbbb-575f.ngrok-free.app") return;
                    resolve(event.type);
                    return 'pepe'
                });

            })
        } catch (error) {
            debugger
        }
    }

}

function abriOtraVentanaYpasaleLaData(eoaAddress: string, chain: BlockchainIncludingTestnet, passphrase: string) {
    const newW = window.open("https://7d62-2800-810-458-1608-44d0-8a84-dbbb-575f.ngrok-free.app/passkeys", "_blank");

    setTimeout(() => {
        newW!.postMessage({ walletAddress: eoaAddress, chain, action: 'encrypt', type: 'passkeysAction', passphrase }, "https://7d62-2800-810-458-1608-44d0-8a84-dbbb-575f.ngrok-free.app/passkeys")
    }, 5000)

    window.onmessage = (event) => {
        console.log('event', event);
    }
}

