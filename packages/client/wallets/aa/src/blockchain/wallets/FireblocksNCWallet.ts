import type { SignTypedDataParams, SmartAccountSigner } from "@alchemy/aa-core";
import {
    ConsoleLogger,
    FireblocksNCW,
    IEventsHandler,
    IMessagesHandler,
    ITransactionSignature,
    TEvent,
    TMPCAlgorithm,
} from "@fireblocks/ncw-js-sdk";
import { fromBytes } from "viem";

import { CrossmintService } from "../../api/CrossmintService";
import { PasswordEncryptedLocalStorage } from "../../storage/PasswordEncryptedLocalStorage";
import { BackupKeysGenerationError, SignTransactionError } from "../../utils/error";
import { Blockchain, getAssetIdByBlockchain } from "../BlockchainNetworks";

export const FireblocksNCWallet = async (
    userEmail: string,
    crossmintService: CrossmintService,
    chain: Blockchain,
    passphrase?: string
) => {
    const { walletId, deviceId, isNew } = await crossmintService.getOrAssignWallet(userEmail);

    // Register a message handler to process outgoing message to your API
    const messagesHandler: IMessagesHandler = {
        handleOutgoingMessage: (message: string) => {
            return crossmintService.rpc(walletId, deviceId, message);
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

    const secureStorageProvider = new PasswordEncryptedLocalStorage(deviceId, () => {
        return crossmintService.getNCWIdentifier(deviceId);
    });

    const fireblocksNCW = await FireblocksNCW.initialize({
        deviceId,
        messagesHandler,
        eventsHandler,
        secureStorageProvider,
        logger: new ConsoleLogger(),
    });

    if (isNew) {
        await fireblocksNCW.generateMPCKeys(getDefaultAlgorithems());
    }

    try {
        if (isNew && passphrase === undefined) {
            throw new BackupKeysGenerationError("Passphrase is required.");
        }
        if (isNew) {
            await fireblocksNCW.backupKeys(passphrase!);
        } else if (passphrase !== undefined) {
            await fireblocksNCW.recoverKeys(passphrase!);
        }
    } catch (e) {
        console.log({ error: e });
        throw new BackupKeysGenerationError("Error generating the backupKeys.");
        // TO DO unassing method that deletes the info in nonCustodialWallet table. Requires modification on crossbit-main.
    }

    return {
        owner: getSmartAccountSignerFromFireblocks(crossmintService, fireblocksNCW, walletId, chain),
    };
};

function getSmartAccountSignerFromFireblocks(
    crossmintService: CrossmintService,
    fireblocksNCW: FireblocksNCW,
    walletId: string,
    chain: Blockchain
): SmartAccountSigner {
    return {
        getAddress: async () => {
            return (await crossmintService.getAddress(walletId, 0, getAssetIdByBlockchain(chain))) as `0x${string}`;
        },
        signMessage: async (msg: Uint8Array | string) => {
            let msg_ = msg;
            if (msg instanceof Uint8Array) {
                msg_ = fromBytes(msg, "hex");
            }
            const tx = await crossmintService.createTransaction(
                msg_ as string,
                walletId,
                getAssetIdByBlockchain(chain),
                false
            );
            const result: ITransactionSignature = await fireblocksNCW.signTransaction(tx);
            console.log(`txId: ${result.txId}`, `status: ${result.transactionSignatureStatus}`);
            handleSignTransactionStatus(result);
            return (await crossmintService.getSignature(tx)) as `0x${string}`;
        },
        signTypedData: async (params: SignTypedDataParams) => {
            const tx = await crossmintService.createTransaction(
                params as any,
                walletId,
                getAssetIdByBlockchain(chain),
                true
            );
            const result: ITransactionSignature = await fireblocksNCW.signTransaction(tx);
            console.log(`txId: ${result.txId}`, `status: ${result.transactionSignatureStatus}`);
            handleSignTransactionStatus(result);
            return (await crossmintService.getSignature(tx)) as `0x${string}`;
        },
    };
}

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
