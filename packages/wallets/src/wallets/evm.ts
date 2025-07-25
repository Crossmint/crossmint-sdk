import {
    createPublicClient,
    encodeFunctionData,
    http,
    type TypedDataDomain,
    type TypedData,
    type TypedDataDefinition,
    type HttpTransport,
} from "viem";
import { isValidEvmAddress } from "@crossmint/common-sdk-base";
import type { EVMTransactionInput, FormattedEVMTransaction, Transaction, TransactionInputOptions } from "./types";
import { type EVMSmartWalletChain, toViemChain } from "../chains/chains";
import { Wallet } from "./wallet";
import type { Chain, EVMChain } from "../chains/chains";
import { InvalidTypedDataError, SignatureNotCreatedError, TransactionNotCreatedError } from "../utils/errors";
import type { CreateTransactionSuccessResponse } from "@/api";

export class EVMWallet extends Wallet<EVMChain> {
    constructor(wallet: Wallet<EVMChain>) {
        super(
            {
                chain: wallet.chain,
                address: wallet.address,
                owner: wallet.owner,
                signer: wallet.signer,
                options: Wallet.getOptions(wallet),
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
    ): Promise<Transaction<T["options"] extends { experimental_prepareOnly: true } ? true : false>> {
        const builtTransaction = this.buildTransaction(params);
        const createdTransaction = await this.createTransaction(builtTransaction, params.options);

        if (params.options?.experimental_prepareOnly) {
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: createdTransaction.id,
            } as Transaction<T["options"] extends { experimental_prepareOnly: true } ? true : false>;
        }

        return await this.approveTransactionAndWait(createdTransaction.id);
    }

    public async signMessage(message: string): Promise<string> {
        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "message",
            params: {
                message: message,
                signer: this.signer.locator(),
                chain: this.chain,
            },
        });
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
        }

        return await this.approveSignatureAndWait(signatureCreationResponse.id);
    }

    public async signTypedData<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(
        params: TypedDataDefinition<typedData, primaryType> & {
            chain: EVMSmartWalletChain;
        }
    ) {
        const { domain, message, primaryType, types, chain } = params;
        if (!domain || !message || !types || !chain) {
            throw new InvalidTypedDataError("Invalid typed data");
        }

        const { name, version, chainId, verifyingContract, salt } = domain as TypedDataDomain;
        if (!name || !version || !chainId || !verifyingContract) {
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
                    types: types as Record<string, Array<{ name: string; type: string }>>,
                },
                signer: this.signer.locator(),
                chain,
                isSmartWalletSignature: false,
            },
        });
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
        }

        return await this.approveSignatureAndWait(signatureCreationResponse.id);
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
