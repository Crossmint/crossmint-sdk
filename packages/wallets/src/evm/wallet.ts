import { WebAuthnP256 } from "ox";
import {
    type Account,
    type Address,
    type Hex,
    type SignableMessage,
    type PublicClient,
    type HttpTransport,
    type TypedData,
    type TypedDataDefinition,
    type TypedDataDomain,
    type EIP1193Provider,
    http,
    createPublicClient,
    concat,
} from "viem";

import { sleep } from "../utils";

import type { ApiClient, GetSignatureResponse, GetTransactionResponse } from "../api";
import entryPointAbi from "./abi/entryPoint";
import { toViemChain, type EVMSmartWalletChain } from "./chains";
import { ENTRY_POINT_ADDRESS, STATUS_POLLING_INTERVAL_MS } from "@/utils/constants";

export type EVMSigner =
    | {
          type: "evm-keypair";
          address: string;
          signer:
              | {
                    type: "provider";
                    provider: EIP1193Provider;
                }
              | {
                    type: "viem";
                    account: Account;
                };
      }
    | {
          type: "evm-passkey";
          id: string;
          name: string;
          publicKey: {
              x: string;
              y: string;
          };
      };

export interface ViemWallet {
    getAddress: () => Address;

    getNonce?: ((parameters?: { key?: bigint | undefined } | undefined) => Promise<bigint>) | undefined;

    signMessage: (parameters: { message: SignableMessage }) => Promise<Hex>;

    signTypedData: <
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(
        parameters: TypedDataDefinition<typedData, primaryType>
    ) => Promise<Hex>;

    sendTransaction: (parameters: {
        to: Address;
        data?: Hex;
        value?: bigint;
    }) => Promise<Hex>;
}

export class EVMSmartWallet implements ViemWallet {
    public readonly publicClient: PublicClient<HttpTransport>;

    constructor(
        public readonly chain: EVMSmartWalletChain,
        private readonly apiClient: ApiClient,
        private readonly address: Address,
        private readonly adminSigner: EVMSigner
    ) {
        this.publicClient = createPublicClient({
            chain: toViemChain(chain),
            transport: http(),
        });
    }

    public async balances(tokens: Address[]) {
        return await this.apiClient.getBalance(this.walletLocator, {
            chains: [this.chain],
            tokens,
        });
    }
    public async transactions() {
        const transactions = await this.apiClient.getTransactions(this.walletLocator);
        return transactions.transactions.filter((transaction) => transaction.walletType === "evm-smart-wallet");
    }
    public async nfts(perPage: number, page: number) {
        return await this.apiClient.getNfts(this.walletLocator, perPage, page);
    }

    public getAddress() {
        return this.address;
    }

    public async getNonce(parameters?: { key?: bigint | undefined } | undefined): Promise<bigint> {
        const nonce = await this.publicClient.readContract({
            abi: entryPointAbi,
            address: ENTRY_POINT_ADDRESS,
            functionName: "getNonce",
            args: [this.address, parameters?.key ?? BigInt(0)],
        });
        return nonce;
    }

    public async signMessage(parameters: {
        message: SignableMessage;
    }): Promise<Hex> {
        if (typeof parameters.message !== "string") {
            throw new Error("Message must be a string");
        }

        // Create signature
        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "evm-message",
            params: {
                message: parameters.message,
                signer: this.signerLocator,
                chain: this.chain,
            },
        });
        const signatureId = signatureCreationResponse.id;

        // Approve signature
        const pendingApprovals = signatureCreationResponse.approvals?.pending || [];
        if (pendingApprovals.length !== 1) {
            throw new Error(`Expected 1 pending approval, got ${pendingApprovals.length}`);
        }
        const pendingApproval = pendingApprovals[0];
        const signature = await this.approveSignature(signatureId, pendingApproval.message as Hex);

        if (signature === undefined) {
            throw new Error("Signature not available");
        }

        // Get signature status until success
        let signatureResponse: GetSignatureResponse | null = null;
        while (signatureResponse === null || signatureResponse.status === "pending") {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            signatureResponse = await this.apiClient.getSignature(this.walletLocator, signatureId);
        }

        if (signatureResponse.status === "failed") {
            throw new Error("Message signing failed");
        }

        return signature;
    }

    public async signTypedData<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(parameters: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
        const { domain, message, primaryType, types } = parameters;
        if (!domain || !message || !types) {
            throw new Error("Invalid typed data");
        }

        const { name, version, chainId, verifyingContract, salt } = domain as TypedDataDomain;
        if (!name || !version || !chainId || !verifyingContract) {
            throw new Error("Invalid typed data domain");
        }

        // Create signature
        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "evm-typed-data",
            params: {
                typedData: {
                    domain: {
                        name,
                        version,
                        chainId,
                        verifyingContract,
                        salt,
                    },
                    message,
                    primaryType,
                    types: types as Record<string, Array<{ name: string; type: string }>>,
                },
                signer: this.signerLocator,
                chain: this.chain,
                isSmartWalletSignature: false,
            },
        });
        const signatureId = signatureCreationResponse.id;

        // Approve signature
        const pendingApprovals = signatureCreationResponse.approvals?.pending || [];
        if (pendingApprovals.length !== 1) {
            throw new Error(`Expected 1 pending approval, got ${pendingApprovals.length}`);
        }
        const pendingApproval = pendingApprovals[0];
        const signature = await this.approveSignature(signatureId, pendingApproval.message as Hex);
        if (signature === undefined) {
            throw new Error("Signature not available");
        }

        // Get signature status until success
        let signatureResponse: GetSignatureResponse | null = null;
        while (signatureResponse === null || signatureResponse.status === "pending") {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            signatureResponse = await this.apiClient.getSignature(this.walletLocator, signatureId);
        }

        if (signatureResponse.status === "failed") {
            throw new Error("Typed data signing failed");
        }

        return signature;
    }

    public async sendTransaction(parameters: {
        to: Address;
        data?: Hex;
        value?: bigint;
    }): Promise<Hex> {
        // Create transaction
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                signer: this.signerLocator,
                chain: this.chain,
                calls: [
                    {
                        to: parameters.to,
                        value: parameters.value ? parameters.value.toString() : "0",
                        data: parameters.data ?? "0x",
                    },
                ],
            },
        });
        const transactionId = transactionCreationResponse.id;

        // Approve transaction
        const pendingApprovals = transactionCreationResponse.approvals?.pending || [];
        if (pendingApprovals.length !== 1) {
            throw new Error(`Expected 1 pending approval, got ${pendingApprovals.length}`);
        }
        const pendingApproval = pendingApprovals[0];
        await this.approveTransaction(transactionId, pendingApproval.message as Hex);

        // Get transaction status until success
        let transactionResponse: GetTransactionResponse | null = null;
        while (transactionResponse === null || transactionResponse.status === "pending") {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            transactionResponse = await this.apiClient.getTransaction(this.walletLocator, transactionId);
        }

        if (transactionResponse.status === "failed") {
            throw new Error("Transaction sending failed");
        }

        // Get transaction hash
        const transactionHash = transactionResponse.onChain.txId;
        if (transactionHash === undefined) {
            throw new Error("Transaction hash not found");
        }
        return transactionHash as Hex;
    }

    private get walletLocator(): string {
        if (this.apiClient.isServerSide) {
            return this.address;
        } else {
            return "evm-smart-wallet";
        }
    }

    private get signerLocator(): string {
        switch (this.adminSigner.type) {
            case "evm-passkey":
                return `evm-passkey:${this.adminSigner.id}`;
            case "evm-keypair":
                return `evm-keypair:${this.adminSigner.address}`;
        }
        throw new Error("Invalid signer type");
    }

    private async approveTransaction(transactionId: string, message: Hex) {
        switch (this.adminSigner.type) {
            case "evm-passkey": {
                const { metadata, signature } = await WebAuthnP256.sign({
                    credentialId: this.adminSigner.id,
                    challenge: message,
                });

                await this.apiClient.approveTransaction(this.walletLocator, transactionId, {
                    approvals: [
                        {
                            signer: `evm-passkey:${this.adminSigner.id}`,
                            // @ts-ignore the generated types are wrong
                            signature: {
                                r: `0x${signature.r.toString(16)}`,
                                s: `0x${signature.s.toString(16)}`,
                            },
                            metadata,
                        },
                    ],
                });
                return;
            }
            case "evm-keypair": {
                const signerAddress = this.adminSigner.address as Address;
                const signature =
                    this.adminSigner.signer.type === "viem"
                        ? await this.adminSigner.signer.account.signMessage!({
                              message: {
                                  raw: message,
                              },
                          })
                        : await this.adminSigner.signer.provider.request({
                              method: "personal_sign",
                              params: [message, signerAddress],
                          });
                await this.apiClient.approveTransaction(this.walletLocator, transactionId, {
                    approvals: [
                        {
                            signature,
                            signer: `evm-keypair:${signerAddress}`,
                        },
                    ],
                });
            }
        }
    }

    private async approveSignature(signatureId: string, message: Hex) {
        switch (this.adminSigner.type) {
            case "evm-passkey": {
                const { metadata, signature } = await WebAuthnP256.sign({
                    credentialId: this.adminSigner.id,
                    challenge: message,
                });

                await this.apiClient.approveSignature(this.walletLocator, signatureId, {
                    approvals: [
                        {
                            signer: `evm-passkey:${this.adminSigner.id}`,
                            // @ts-ignore the generated types are wrong
                            signature: {
                                r: `0x${signature.r.toString(16)}`,
                                s: `0x${signature.s.toString(16)}`,
                            },
                            metadata,
                        },
                    ],
                });

                // Convert signature to hex
                return concat([`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`]);
            }
            case "evm-keypair": {
                const signerAddress = this.adminSigner.address as Address;
                const signature =
                    this.adminSigner.signer.type === "viem"
                        ? await this.adminSigner.signer.account.signMessage!({
                              message: {
                                  raw: message,
                              },
                          })
                        : await this.adminSigner.signer.provider.request({
                              method: "personal_sign",
                              params: [message, signerAddress],
                          });
                await this.apiClient.approveSignature(this.walletLocator, signatureId, {
                    approvals: [
                        {
                            signature,
                            signer: `evm-keypair:${signerAddress}`,
                        },
                    ],
                });

                return signature;
            }
        }
    }
}

export class EVMMPCWallet {}
