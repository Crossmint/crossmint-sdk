import bs58 from "bs58";
import { isValidSolanaAddress, WithLoggerContext } from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain } from "../chains/chains";
import type {
    ApproveOptions,
    PrepareOnly,
    SolanaTransactionInput,
    Transaction,
    TransactionInputOptions,
} from "./types";
import { Wallet } from "./wallet";
import { TransactionNotCreatedError } from "../utils/errors";
import { SolanaExternalWalletSigner } from "@/signers/solana-external-wallet";
import type { CreateTransactionSuccessResponse } from "@/api";
import { walletsLogger } from "../logger";
import { payX402 } from "../x402/faremeter";

export class SolanaWallet extends Wallet<SolanaChain> {
    constructor(wallet: Wallet<SolanaChain>) {
        super(
            {
                chain: wallet.chain,
                address: wallet.address,
                owner: wallet.owner,
                signer: wallet.signer,
                options: Wallet.getOptions(wallet),
                alias: wallet.alias,
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
        params: SolanaTransactionInput
    ): Promise<Transaction<T extends PrepareOnly<true> ? true : false>> {
        walletsLogger.info("solanaWallet.sendTransaction.start");

        await this.preAuthIfNeeded();
        const createdTransaction = await this.createTransaction(params);

        if (params.options?.experimental_prepareOnly) {
            walletsLogger.info("solanaWallet.sendTransaction.prepared", {
                transactionId: createdTransaction.id,
            });
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: createdTransaction.id,
            } as Transaction<T extends PrepareOnly<true> ? true : false>;
        }

        const _additionalSigners = params.additionalSigners?.map(
            (signer) =>
                new SolanaExternalWalletSigner({
                    type: "external-wallet",
                    address: signer.publicKey.toString(),
                    locator: `external-wallet:${signer.publicKey.toString()}`,
                    onSignTransaction: (transaction) => {
                        transaction.sign([signer]);
                        return Promise.resolve(transaction);
                    },
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
        return result;
    }

    /**
     * Pay via the X402 protocol
     * @param url - The payment URL
     * @throws {Error} If the payment fails
     * @experimental This API is experimental and may change in the future
     */
    public override async experimental_payX402(
        url: string,
        options?: { method?: "GET" | "POST"; headers?: Record<string, string> }
    ) {
        const initialResponse = await fetch(url);
        if (initialResponse.status !== 402) {
            return;
        }

        const body = await initialResponse.json();
        const accepts: {
            network: string;
            asset: string;
            extra?: { features?: { xSettlementAccountSupported?: boolean } };
        }[] = body.accepts ?? [];

        const settlementAccept = accepts.find((a) => a.extra?.features?.xSettlementAccountSupported === true);
        if (settlementAccept != null) {
            return await payX402(this, url, settlementAccept.network, settlementAccept.asset, options);
        }
        throw new Error("Payment not supported");
    }

    private async createTransaction(params: SolanaTransactionInput): Promise<CreateTransactionSuccessResponse> {
        const signer = params.options?.experimental_signer ?? this.signer.locator();

        let serializedTransaction: string;

        if ("serializedTransaction" in params) {
            serializedTransaction = params.serializedTransaction;
        } else {
            serializedTransaction = bs58.encode(params.transaction.serialize());
        }

        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction: serializedTransaction,
                signer,
            },
        });

        if ("error" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return transactionCreationResponse;
    }
}
