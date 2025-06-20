import { createPublicClient, type TypedDataDomain, http } from "viem";
import type { TypedData, TypedDataDefinition, HttpTransport } from "viem";
import type { EVMTransactionInput, Transaction } from "./types";
import { type EVMSmartWalletChain, toViemChain } from "../chains/chains";
import { Wallet } from "./wallet";
import type { Chain, EVMChain } from "../chains/chains";
import { InvalidTypedDataError, SignatureNotCreatedError, TransactionNotCreatedError } from "../utils/errors";
import { isValidEvmAddress } from "@crossmint/common-sdk-base";

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

    public async sendTransaction(params: EVMTransactionInput): Promise<Transaction> {
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                signer: this.signer.locator(),
                chain: this.chain,
                calls: [
                    {
                        to: params.to,
                        value: params.value ? params.value.toString() : "0",
                        data: params.data ?? "0x",
                    },
                ],
            },
        });
        if ("error" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return await this.approveAndWait(transactionCreationResponse.id);
    }

    public async signMessage(message: string): Promise<string> {
        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "evm-message",
            params: {
                message: message,
                signer: this.signer.locator(),
                chain: this.chain,
            },
        });
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
        }

        const signatureId = signatureCreationResponse.id;
        const pendingApprovals = signatureCreationResponse.approvals?.pending || [];
        await this.approveSignature(pendingApprovals, signatureId);
        return await this.waitForSignature(signatureId);
    }

    public async createTypedDataSignature<
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
            type: "evm-typed-data",
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

        const signatureId = signatureCreationResponse.id;
        const pendingApprovals = signatureCreationResponse.approvals?.pending || [];
        await this.approveSignature(pendingApprovals, signatureId);
        return await this.waitForSignature(signatureId);
    }

    public getViemClient(params?: { transport?: HttpTransport }) {
        return createPublicClient({
            transport: params?.transport ?? http(),
            chain: toViemChain(this.chain),
        });
    }
}
