import { createPublicClient, encodeFunctionData, http, type TypedDataDomain, type HttpTransport } from "viem";
import { isValidEvmAddress, WithLoggerContext } from "@crossmint/common-sdk-base";
import type {
    EVMTransactionInput,
    FormattedEVMTransaction,
    PrepareOnly,
    Signature,
    SignMessageInput,
    SignTypedDataInput,
    Transaction,
} from "./types";
import { toViemChain } from "../chains/chains";
import { Wallet } from "./wallet";
import type { Chain, EVMChain } from "../chains/chains";
import {
    InvalidTypedDataError,
    SignatureNotCreatedError,
    throwIfQuorumApiError,
    TransactionNotCreatedError,
} from "../utils/errors";
import type { CreateTransactionParams, CreateTransactionSuccessResponse } from "@/api";
import { walletsLogger } from "../logger";

export class EVMWallet extends Wallet<EVMChain> {
    constructor(wallet: Wallet<EVMChain>) {
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
                quorumMemberLocator: Wallet.getQuorumMemberLocator(wallet),
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

    /**
     * Send a raw EVM transaction.
     * @param params - The transaction parameters (raw transaction, ABI call, or encoded data)
     * When the signer is a quorum, named (`quorum:…`) or inferred from a key that is only a member, the call returns
     * the transaction unsigned and without a hash, as with `prepareOnly: true`; pass `prepareOnly: true` for that type.
     * @returns The transaction result
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "evmWallet.sendTransaction",
        buildContext(thisArg: EVMWallet) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async sendTransaction<T extends EVMTransactionInput>(
        params: T
    ): Promise<Transaction<T["options"] extends PrepareOnly<true> ? true : false>> {
        walletsLogger.info("evmWallet.sendTransaction.start");

        await this.preAuthIfNeeded();
        const builtTransaction = this.buildTransaction(params);
        const signerParams = await this.resolveSignerParams(params.options);
        const createdTransaction = await this.createTransaction(builtTransaction, signerParams);

        if (this.isPrepareOnly(params.options, signerParams.signer)) {
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

    /**
     * Sign a message with the wallet's private key.
     * When the signer is a quorum (named in `signer`, or inferred from a key that is only a quorum member), the call
     * returns the created request unsigned and without a signature, as with `prepareOnly: true`.
     * @param params - The message to sign
     * @returns The signature
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "evmWallet.signMessage",
        buildContext(thisArg: EVMWallet) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async signMessage<T extends SignMessageInput>(
        params: T
    ): Promise<Signature<T["options"] extends PrepareOnly<true> ? true : false>> {
        walletsLogger.info("evmWallet.signMessage.start");

        await this.preAuthIfNeeded();
        const signerParams = await this.resolveSignerParams(params.options);
        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "message",
            params: {
                message: params.message,
                ...signerParams,
                chain: this.chain,
            },
        });
        if ("error" in signatureCreationResponse) {
            walletsLogger.error("evmWallet.signMessage.error", { error: signatureCreationResponse });
            throwIfQuorumApiError(signatureCreationResponse);
            throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
        }

        if (this.isPrepareOnly(params.options, signerParams.signer)) {
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

    /**
     * Sign EIP-712 typed data.
     * When the signer is a quorum, the call returns the created request unsigned, as {@link signMessage} does.
     * @param params - The typed data parameters (domain, types, message, primaryType, chain)
     * @returns The signature
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "evmWallet.signTypedData",
        buildContext(thisArg: EVMWallet) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async signTypedData<T extends SignTypedDataInput>(
        params: T
    ): Promise<Signature<T["options"] extends PrepareOnly<true> ? true : false>> {
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

        const signerParams = await this.resolveSignerParams(params.options);
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
                    message: stringifyBigInts(message),
                    primaryType,
                    types: types as unknown as Record<string, Array<{ name: string; type: string }>>,
                },
                ...signerParams,
                chain,
            },
        });
        if ("error" in signatureCreationResponse) {
            walletsLogger.error("evmWallet.signTypedData.error", { error: signatureCreationResponse });
            throwIfQuorumApiError(signatureCreationResponse);
            throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
        }

        if (this.isPrepareOnly(params.options, signerParams.signer)) {
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

    /**
     * Get a Viem public client instance configured for this wallet's chain.
     * @param params - Optional transport configuration
     * @returns A Viem public client
     */
    public getViemClient(params?: { transport?: HttpTransport }) {
        return createPublicClient({
            transport: params?.transport ?? http(),
            chain: toViemChain(this.chain),
        });
    }

    private async createTransaction(
        transaction: FormattedEVMTransaction,
        signerParams: { signer: string }
    ): Promise<CreateTransactionSuccessResponse> {
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                ...signerParams,
                chain: this.chain,
                calls: [transaction],
            },
        } as CreateTransactionParams);
        if ("error" in transactionCreationResponse) {
            throwIfQuorumApiError(transactionCreationResponse);
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

function stringifyBigInts<T>(value: T): T {
    if (typeof value === "bigint") return value.toString() as unknown as T;
    if (Array.isArray(value)) return value.map(stringifyBigInts) as unknown as T;
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stringifyBigInts(v)])
        ) as T;
    }
    return value;
}
