import { logError } from "@/services/logging";
import { LocalStorageRepository } from "@/storage";
import { UserIdentifier } from "@/types";
import { SCW_SERVICE } from "@/utils";
import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import {
    FireblocksNCWFactory,
    IEventsHandler,
    IFireblocksNCW,
    IMessagesHandler,
    ITransactionSignature,
    TEvent,
    TMPCAlgorithm,
} from "@fireblocks/ncw-js-sdk";
import { fromBytes } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { PasswordEncryptedLocalStorage } from "../../storage/PasswordEncryptedLocalStorage";
import { KeysGenerationError, NonCustodialWalletError, SignTransactionError, errorToJSON } from "../../utils/error";
import { getFireblocksAssetId } from "../BlockchainNetworks";

type FireblocksNCWWalletInput = {
    userIdentifier: UserIdentifier;
    projectId: string;
    crossmintService: CrossmintWalletService;
    chain: EVMBlockchainIncludingTestnet;
    passphrase: string;
    ncwData?: { walletId: string; deviceId: string };
};

export const FireblocksNCWallet = async ({
    userIdentifier,
    projectId,
    crossmintService,
    chain,
    passphrase,
    ncwData,
}: FireblocksNCWWalletInput) => {
    const localStorageRepository = new LocalStorageRepository(userIdentifier, projectId);

    let _walletId: string;
    let _deviceId: string;
    let isNew: boolean;

    if (ncwData) {
        _walletId = ncwData.walletId;
        _deviceId = ncwData.deviceId;
        isNew = false;
    } else {
        const ncwData = localStorageRepository.ncwData ?? (await crossmintService.getOrAssignWallet(userIdentifier));
        _walletId = ncwData.walletId;
        _deviceId = ncwData.deviceId;
        isNew = ncwData.isNew !== undefined ? ncwData.isNew : false;
    }

    // Register a message handler to process outgoing message to your API
    const messagesHandler: IMessagesHandler = {
        handleOutgoingMessage: async (message: string) => {
            const rpcResponse = await crossmintService.rpc(_walletId, _deviceId, message);
            if (rpcResponse.error !== undefined) {
                if (rpcResponse.error.code === -1) {
                    //Unexpected physicalDeviceId
                    logError("[FIREBLOCKS_RPC] - ERROR_UNEXPECTED_PHYSICAL_DEVICE_ID", {
                        service: SCW_SERVICE,
                        error: errorToJSON(rpcResponse.error),
                        walletId: _walletId,
                        deviceId: _deviceId,
                        chain,
                        user: userIdentifier,
                    });
                    throw new NonCustodialWalletError(`Unexpected physicalDeviceId`);
                }
                logError("[FIREBLOCKS_RPC] - ERROR", {
                    service: SCW_SERVICE,
                    error: errorToJSON(rpcResponse.error),
                    message: rpcResponse.error.message,
                    walletId: _walletId,
                    deviceId: _deviceId,
                    chain,
                    user: userIdentifier,
                });
                throw new NonCustodialWalletError(`NCW Error: ${rpcResponse.error.message}`);
            }
            return rpcResponse;
        },
    };

    // Register an events handler to handle on various events that the SDK emitts
    const eventsHandler: IEventsHandler = {
        handleEvent: (event: TEvent) => {
            if (
                event.type === "key_descriptor_changed" ||
                event.type === "key_takeover_changed" ||
                event.type === "transaction_signature_changed"
            ) {
                // Do something when the event is fired.
                console.log(event);
            }
        },
    };

    const secureStorageProvider = new PasswordEncryptedLocalStorage(_deviceId, () => {
        return passphrase;
    });

    const fireblocksNCW = await FireblocksNCWFactory({
        env: "production",
        deviceId: _deviceId,
        messagesHandler,
        eventsHandler,
        secureStorageProvider,
    });

    if (isNew) {
        try {
            await fireblocksNCW.generateMPCKeys(getDefaultAlgorithems());
            await fireblocksNCW.backupKeys(passphrase, _deviceId); //using the deviceId as a passphraseId to match implementation.
        } catch (error: any) {
            logError("[FIREBLOCKS_GENEARTE_MPC_KEYS] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                walletId: _walletId,
                deviceId: _deviceId,
                chain,
                user: userIdentifier,
            });
            await crossmintService.unassignWallet(userIdentifier);
            throw new KeysGenerationError(`Error generating keys. ${error?.title ?? ""}}`);
        }
    } else {
        try {
            await fireblocksNCW.recoverKeys(async (passphraseId) => {
                // Implement logic to fetch the passphrase using the passphraseId
                // For example, fetch from a database or an API

                /*if (!passphrase) {
                    throw new Error("Passphrase not found for given id");
                }*/
                // Now the passphraseId is the deviceId, it will pass the validation
                if (passphraseId !== _deviceId) {
                    throw new Error("Invalid passphraseId. Can not recover the keys.");
                }
                return passphrase;
            });
        } catch (error: any) {
            logError("[FIREBLOCKS_NCW] - ERROR_RECOVERING_KEYS", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                walletId: _walletId,
                deviceId: _deviceId,
                chain,
                user: userIdentifier,
            });
            throw new KeysGenerationError(`Error recovering keys. ${error?.title ?? ""}`);
        }
    }

    localStorageRepository.ncwData = { walletId: _walletId, deviceId: _deviceId };

    return {
        owner: getSmartAccountSignerFromFireblocks(
            crossmintService,
            fireblocksNCW,
            _walletId,
            chain,
            localStorageRepository
        ),
    };
};

export function getSmartAccountSignerFromFireblocks(
    crossmintService: CrossmintWalletService,
    fireblocksNCW: IFireblocksNCW,
    walletId: string,
    chain: EVMBlockchainIncludingTestnet,
    localStorageRepository: LocalStorageRepository
): SmartAccountSigner {
    return {
        getAddress: async () => {
            let address = localStorageRepository.ncwAddress;
            if (!address) {
                address = await crossmintService.getAddress(walletId, 0, getFireblocksAssetId(chain));
                localStorageRepository.ncwAddress = address;
            }
            return address as `0x${string}`;
        },
        signMessage: async (msg: Uint8Array | string) => {
            return signMessage(crossmintService, fireblocksNCW, walletId, chain, msg);
        },
        signTypedData: async (params: SignTypedDataParams) => {
            return signTypedData(crossmintService, fireblocksNCW, walletId, chain, params);
        },
    };
}

const signMessage = async (
    crossmintService: CrossmintWalletService,
    fireblocksNCW: IFireblocksNCW,
    walletId: string,
    chain: EVMBlockchainIncludingTestnet,
    msg: Uint8Array | string
) => {
    const msg_ = msg instanceof Uint8Array ? fromBytes(msg, "hex") : msg;
    const tx = await crossmintService.createTransaction(msg_ as string, walletId, getFireblocksAssetId(chain), false);
    try {
        const result: ITransactionSignature = await fireblocksNCW.signTransaction(tx);
        console.log(`txId: ${result.txId}`, `status: ${result.transactionSignatureStatus}`);
        handleSignTransactionStatus(result);
    } catch (error: any) {
        logError("[FIREBLOCKS_SIGN_MESSAGE] - ERROR", {
            service: SCW_SERVICE,
            error: errorToJSON(error),
            walletId,
            chain,
            message: msg,
        });
        throw new SignTransactionError(`Error signing transaction. ${error?.title ?? ""}`);
    }
    return (await crossmintService.getSignature(tx)) as `0x${string}`;
};

const signTypedData = async (
    crossmintService: CrossmintWalletService,
    fireblocksNCW: IFireblocksNCW,
    walletId: string,
    chain: EVMBlockchainIncludingTestnet,
    params: SignTypedDataParams
) => {
    const tx = await crossmintService.createTransaction(params as any, walletId, getFireblocksAssetId(chain), true);
    try {
        const result: ITransactionSignature = await fireblocksNCW.signTransaction(tx);
        console.log(`txId: ${result.txId}`, `status: ${result.transactionSignatureStatus}`);
        handleSignTransactionStatus(result);
    } catch (error: any) {
        logError("[FIREBLOCKS_SIGN_TYPED_DATA] - ERROR", {
            service: SCW_SERVICE,
            error: errorToJSON(error),
            walletId,
            chain,
            params,
        });
        throw new SignTransactionError(`Error signing transaction. ${error?.title ?? ""}`);
    }
    return (await crossmintService.getSignature(tx)) as `0x${string}`;
};

const handleSignTransactionStatus = (result: ITransactionSignature) => {
    if (result.transactionSignatureStatus === "TIMEOUT") {
        throw new SignTransactionError(`Timeout signing transaction ${result.txId}`);
    }
    if (result.transactionSignatureStatus === "ERROR") {
        throw new SignTransactionError(`There has been an error signing transaction ${result.txId}`);
    }
};

const getDefaultAlgorithems = (): Set<TMPCAlgorithm> => {
    const algorithms = new Set<TMPCAlgorithm>();
    algorithms.add("MPC_CMP_ECDSA_SECP256K1");
    return algorithms;
};
