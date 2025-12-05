import { createPublicClient, encodeFunctionData, http, type TypedDataDomain, type HttpTransport } from "viem";
import { isValidEvmAddress } from "@crossmint/common-sdk-base";
import type {
    EVMTransactionInput,
    FormattedEVMTransaction,
    PrepareOnly,
    Signature,
    SignMessageInput,
    SignTypedDataInput,
    Transaction,
    TransactionInputOptions,
} from "./types";
import { toViemChain } from "../chains/chains";
import { Wallet } from "./wallet";
import type { Chain, EVMChain } from "../chains/chains";
import { InvalidTypedDataError, SignatureNotCreatedError, TransactionNotCreatedError } from "../utils/errors";
import type { CreateTransactionSuccessResponse } from "@/api";
import { walletsLogger } from "../logger";

export class EVMWallet extends Wallet<EVMChain> {
    constructor(wallet: Wallet<EVMChain>) {
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
        if (!isValidEvmAddress(wallet.address)) {
            throw new Error("Wallet is not an EVM wallet");
        }

        return new EVMWallet(wallet as Wallet<EVMChain>);
    }

    public async sendTransaction<T extends EVMTransactionInput>(
        params: T
    ): Promise<Transaction<T["options"] extends PrepareOnly<true> ? true : false>> {
        return walletsLogger.withContext(
            "evmWallet.sendTransaction",
            { chain: this.chain, address: this.address },
            async () => {
                walletsLogger.info("evmWallet.sendTransaction.start");

                await this.preAuthIfNeeded();
                const builtTransaction = this.buildTransaction(params);
                const createdTransaction = await this.createTransaction(builtTransaction, params.options);

                if (params.options?.experimental_prepareOnly) {
                    walletsLogger.info("evmWallet.sendTransaction.prepared", {
                        transactionId: createdTransaction.id,
                    });
                    return {
                        hash: undefined,
                        explorerLink: undefined,
                        transactionId: createdTransaction.id,
                    } as Transaction<T["options"] extends PrepareOnly<true> ? true : false>;
                }

                const result = await this.approveTransactionAndWait(createdTransaction.id);
                walletsLogger.info("evmWallet.sendTransaction.success", {
                    transactionId: createdTransaction.id,
                    hash: result.hash,
                });
                return result;
            }
        );
    }

    public async signMessage<T extends SignMessageInput>(
        params: T
    ): Promise<Signature<T["options"] extends PrepareOnly<true> ? true : false>> {
        return walletsLogger.withContext(
            "evmWallet.signMessage",
            { chain: this.chain, address: this.address },
            async () => {
                walletsLogger.info("evmWallet.signMessage.start");

                await this.preAuthIfNeeded();
                const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
                    type: "message",
                    params: {
                        message: params.message,
                        signer: this.signer.locator(),
                        chain: this.chain,
                    },
                });
                if ("error" in signatureCreationResponse) {
                    walletsLogger.error("evmWallet.signMessage.error", { error: signatureCreationResponse });
                    throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
                }

                if (params.options?.experimental_prepareOnly) {
                    walletsLogger.info("evmWallet.signMessage.prepared", {
                        signatureId: signatureCreationResponse.id,
                    });
                    return {
                        signature: undefined,
                        signatureId: signatureCreationResponse.id,
                    } as Signature<T["options"] extends PrepareOnly<true> ? true : false>;
                }

                const result = await this.approveSignatureAndWait(signatureCreationResponse.id);
                walletsLogger.info("evmWallet.signMessage.success", { signatureId: signatureCreationResponse.id });
                return result;
            }
        );
    }

    public async signTypedData<T extends SignTypedDataInput>(
        params: T
    ): Promise<Signature<T["options"] extends PrepareOnly<true> ? true : false>> {
        return walletsLogger.withContext(
            "evmWallet.signTypedData",
            { chain: this.chain, address: this.address },
            async () => {
                walletsLogger.info("evmWallet.signTypedData.start");

                await this.preAuthIfNeeded();
                const { domain, message, primaryType, types, chain } = params;
                if (!domain || !message || !types || !chain) {
                    walletsLogger.error("evmWallet.signTypedData.error", { error: "Invalid typed data" });
                    throw new InvalidTypedDataError("Invalid typed data");
                }

                const { name, version, chainId, verifyingContract, salt } = domain as TypedDataDomain;
                if (!name || !version || !chainId || !verifyingContract) {
                    walletsLogger.error("evmWallet.signTypedData.error", { error: "Invalid typed data domain" });
                    throw new InvalidTypedDataError("Invalid typed data domain");
                }

                const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
                    type: "typed-data",
                    params: {
                        typedData: {
                            domain: {
                                name,
                                version,
                                chainId: Number(chainId),
                                verifyingContract,
                                salt,
                            },
                            message,
                            primaryType,
                            types: types as unknown as Record<string, Array<{ name: string; type: string }>>,
                        },
                        signer: this.signer.locator(),
                        chain,
                    },
                });
                if ("error" in signatureCreationResponse) {
                    walletsLogger.error("evmWallet.signTypedData.error", { error: signatureCreationResponse });
                    throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
                }

                if (params.options?.experimental_prepareOnly) {
                    walletsLogger.info("evmWallet.signTypedData.prepared", {
                        signatureId: signatureCreationResponse.id,
                    });
                    return {
                        signature: undefined,
                        signatureId: signatureCreationResponse.id,
                    } as Signature<T["options"] extends PrepareOnly<true> ? true : false>;
                }

                const result = await this.approveSignatureAndWait(signatureCreationResponse.id);
                walletsLogger.info("evmWallet.signTypedData.success", { signatureId: signatureCreationResponse.id });
                return result;
            }
        );
    }

    public getViemClient(params?: { transport?: HttpTransport }) {
        return createPublicClient({
            transport: params?.transport ?? http(),
            chain: toViemChain(this.chain),
        });
    }

    private async createTransaction(
        transaction: FormattedEVMTransaction,
        options?: TransactionInputOptions
    ): Promise<CreateTransactionSuccessResponse> {
        const signer = options?.experimental_signer ?? this.signer.locator();
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                signer,
                chain: this.chain,
                calls: [transaction],
            },
        });
        if ("error" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return transactionCreationResponse;
    }

    private buildTransaction(params: EVMTransactionInput): FormattedEVMTransaction {
        if ("transaction" in params) {
            return { transaction: params.transaction };
        }

        if (params.abi == null) {
            return {
                to: params.to,
                value: params.value?.toString() ?? "0",
                data: params.data ?? "0x",
            };
        }

        if (!params.functionName) {
            throw new Error("Function name is required");
        }

        return {
            to: params.to,
            value: params.value?.toString() ?? "0",
            data: encodeFunctionData({
                abi: params.abi,
                functionName: params.functionName,
                args: params.args,
            }),
        };
    }
}
