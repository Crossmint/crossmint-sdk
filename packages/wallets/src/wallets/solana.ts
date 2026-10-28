import bs58 from "bs58";
import { ed25519Sign } from "../utils/ed25519";
import { isValidSolanaAddress, WithLoggerContext } from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain } from "../chains/chains";
import type { ApproveOptions, SolanaTransactionInput, TransactionInputOptions, TransactionResult } from "./types";
import { Wallet } from "./wallet";
import { throwIfQuorumApiError, TransactionNotCreatedError } from "../utils/errors";
import { SolanaExternalWalletSigner } from "@/signers/solana-external-wallet";
import type { CreateTransactionSuccessResponse } from "@/api";
import { walletsLogger } from "../logger";

export class SolanaWallet extends Wallet<SolanaChain> {
    constructor(wallet: Wallet<SolanaChain>) {
        super(
            {
                chain: wallet.chain,
                address: wallet.address,
                owner: wallet.owner,
                options: Wallet.getOptions(wallet),
                alias: wallet.alias,
                recovery: Wallet.getRecoverySigners(wallet),
                apiRecoveryServerSignerAddresses: Wallet.getApiRecoveryServerSignerAddresses(wallet),
                apiDelegatedServerSignerAddresses: Wallet.getApiDelegatedServerSignerAddresses(wallet),
                signer: wallet.signer,
                signers: Wallet.getInitialSigners(wallet),
            },
            Wallet.getApiClient(wallet)
        );
    }

    static from(wallet: Wallet<Chain>) {
        if (!isValidSolanaAddress(wallet.address)) {
            throw new Error("Wallet is not a Solana wallet");
        }

        return new SolanaWallet(wallet as Wallet<SolanaChain>);
    }

    /**
     * Send a raw Solana transaction.
     * @param params - The transaction parameters (serialized transaction or Transaction object)
     * @returns The transaction result
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "solanaWallet.sendTransaction",
        buildContext(thisArg: SolanaWallet) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async sendTransaction<T extends TransactionInputOptions | undefined = undefined>(
        params: SolanaTransactionInput & { options?: T }
    ): Promise<TransactionResult<T>> {
        walletsLogger.info("solanaWallet.sendTransaction.start");

        this.assertActingOptions(params.options);
        await this.preAuthIfNeeded();
        const createdTransaction = await this.createTransaction(params);

        if (params.options?.prepareOnly) {
            walletsLogger.info("solanaWallet.sendTransaction.prepared", {
                transactionId: createdTransaction.id,
            });
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: createdTransaction.id,
            } as TransactionResult<T>;
        }

        const _additionalSigners = params.additionalSigners?.map(
            (signer) =>
                new SolanaExternalWalletSigner({
                    type: "external-wallet",
                    address: signer.publicKey.toString(),
                    locator: `external-wallet:${signer.publicKey.toString()}`,
                    onSign: (transaction) => {
                        transaction.sign([signer]);
                        return Promise.resolve(transaction);
                    },
                    onSignBytes: (payload) =>
                        Promise.resolve(bs58.encode(ed25519Sign(bs58.decode(payload), signer.secretKey))),
                })
        );

        const options: ApproveOptions = {
            additionalSigners: _additionalSigners,
        };

        const result = await this.approveTransactionAndWait(createdTransaction.id, options);
        walletsLogger.info("solanaWallet.sendTransaction.success", {
            transactionId: createdTransaction.id,
            hash: result.hash,
        });
        return result as TransactionResult<T>;
    }

    private async createTransaction(params: SolanaTransactionInput): Promise<CreateTransactionSuccessResponse> {
        const signerParams = this.resolveSignerParams(params.options);

        let serializedTransaction: string;

        if ("serializedTransaction" in params) {
            serializedTransaction = params.serializedTransaction;
        } else {
            serializedTransaction = bs58.encode(params.transaction.serialize());
        }

        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction: serializedTransaction,
                ...signerParams,
            },
        });

        if ("error" in transactionCreationResponse) {
            throwIfQuorumApiError(transactionCreationResponse);
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return transactionCreationResponse;
    }
}
