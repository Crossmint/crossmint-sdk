import { createPublicClient, TypedDataDomain } from "viem";
import { http } from "viem";
import { EVMTransactionInput, PendingApproval } from "./types";
import { Hex, TypedData, TypedDataDefinition } from "viem";
import { EVMSmartWalletChain, toViemChain } from "../chains/chains";
import { HttpTransport } from "viem";
import { Wallet } from "./wallet";
import { EVMChain } from "../chains/chains";
import {
    InvalidSignerError,
    InvalidTypedDataError,
    SignatureNotFoundError,
    SignatureNotCreatedError,
    TransactionNotCreatedError,
    SigningFailedError,
    SignatureNotAvailableError,
} from "@/utils/errors";
import { GetSignatureResponse } from "@/api/types";
import { STATUS_POLLING_INTERVAL_MS } from "../utils/constants";

export class EVMWallet extends Wallet<EVMChain> {
    constructor(wallet: Wallet<EVMChain>) {
        super(
            {
                chain: wallet.chain,
                address: wallet.address,
                owner: wallet.owner,
                signer: wallet.signer,
            },
            Wallet.getApiClient(wallet)
        );
    }

    static from(wallet: Wallet<EVMChain>) {
        return new EVMWallet(wallet);
    }

    public async sendTransaction(params: EVMTransactionInput): Promise<string> {
        const transactionCreationResponse =
            await this.apiClient.createTransaction(this.walletLocator, {
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
            throw new TransactionNotCreatedError(
                JSON.stringify(transactionCreationResponse)
            );
        }

        const hash = await this.approveAndWait(transactionCreationResponse.id);

        return hash;
    }

    public async signMessage(message: string): Promise<string> {
        const signatureCreationResponse = await this.apiClient.createSignature(
            this.walletLocator,
            {
                type: "evm-message",
                params: {
                    message: message,
                    signer: this.signer.locator(),
                    chain: this.chain,
                },
            }
        );
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(
                JSON.stringify(signatureCreationResponse)
            );
        }

        const signatureId = signatureCreationResponse.id;
        const pendingApprovals =
            signatureCreationResponse.approvals?.pending || [];
        await this.approveSignature(pendingApprovals, signatureId);
        return await this.waitForSignature(signatureId);
    }

    public async createTypedDataSignature<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
    >(
        params: TypedDataDefinition<typedData, primaryType> & {
            chain: EVMSmartWalletChain;
        }
    ) {
        const { domain, message, primaryType, types, chain } = params;
        if (!domain || !message || !types || !chain) {
            throw new InvalidTypedDataError("Invalid typed data");
        }

        const { name, version, chainId, verifyingContract, salt } =
            domain as TypedDataDomain;
        if (!name || !version || !chainId || !verifyingContract) {
            throw new InvalidTypedDataError("Invalid typed data domain");
        }

        const signatureCreationResponse = await this.apiClient.createSignature(
            this.walletLocator,
            {
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
                        types: types as Record<
                            string,
                            Array<{ name: string; type: string }>
                        >,
                    },
                    signer: this.signer.locator(),
                    chain,
                    isSmartWalletSignature: false,
                },
            }
        );
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(
                JSON.stringify(signatureCreationResponse)
            );
        }

        const signatureId = signatureCreationResponse.id;
        const pendingApprovals =
            signatureCreationResponse.approvals?.pending || [];
        await this.approveSignature(pendingApprovals, signatureId);
        return await this.waitForSignature(signatureId);
    }

    // TODO: implement proper viem client...
    public getViemClient(params?: { transport?: HttpTransport }) {
        return createPublicClient({
            transport: params?.transport ?? http(),
            chain: toViemChain(this.chain),
        });
    }

    private async approveSignature(
        pendingApprovals: Array<PendingApproval>,
        signatureId: string
    ) {
        const pendingApproval = pendingApprovals.find(
            (approval) => approval.signer === this.signer.locator()
        );
        if (!pendingApproval) {
            throw new InvalidSignerError(
                `Signer ${this.signer.locator()} not found in pending approvals`
            );
        }
        const message = pendingApproval.message as Hex;

        const signature = await this.signer.sign(message);

        if (signature === undefined) {
            throw new SignatureNotFoundError("Signature not available");
        }

        await this.apiClient.approveSignature(this.walletLocator, signatureId, {
            approvals: [
                {
                    signer: this.signer.locator(),
                    // @ts-ignore the generated types are wrong
                    signature: signature,
                },
            ],
        });

        return signature;
    }

    private async waitForSignature(signatureId: string): Promise<string> {
        let signatureResponse: GetSignatureResponse | null = null;

        do {
            await new Promise((resolve) =>
                setTimeout(resolve, STATUS_POLLING_INTERVAL_MS)
            );
            signatureResponse = await this.apiClient.getSignature(
                // @ts-ignore id type is wrong
                this.walletLocator,
                signatureId
            );
            if ("error" in signatureResponse) {
                throw new SignatureNotAvailableError(
                    JSON.stringify(signatureResponse)
                );
            }
        } while (
            signatureResponse === null ||
            signatureResponse.status === "pending"
        );

        if (signatureResponse.status === "failed") {
            throw new SigningFailedError("Signature signing failed");
        }

        if (!signatureResponse.outputSignature) {
            throw new SignatureNotAvailableError("Signature not available");
        }

        return signatureResponse.outputSignature;
    }
}
