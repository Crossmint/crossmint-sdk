import { type Crossmint, createCrossmint } from "@crossmint/common-sdk-base";
import type { VersionedTransaction } from "@solana/web3.js";
import type { Hex, Address, SignableMessage, HttpTransport, TypedDataDefinition, TypedData } from "viem";
import { createPublicClient, http } from "viem";

import { ApiClient, type WalletBalance, type DelegatedSigner as DelegatedSignerDto } from "./api";
import { WalletNotAvailableError, WalletTypeNotSupportedError } from "./utils/errors";
import { SolanaTransactionsService } from "./services/transactions/solana-service";
import { SolanaDelegatedSignerService } from "./services/delegated-signers/solana-service";
import { EVMDelegatedSignerService } from "./services/delegated-signers/evm-service";
import type { EVMSmartWalletChain } from "./evm/chains";
import { sleep } from "./utils";
import { ENTRY_POINT_ADDRESS, STATUS_POLLING_INTERVAL_MS } from "./utils/constants";
import entryPointAbi from "./evm/abi/entryPoint";
import { isValidEVMChain, toViemChain } from "./evm/chains";
import { EVMApprovalService } from "./services/approvals/evm-approval-service";
import { SolanaApprovalService } from "./services/approvals/solana-approval-service";
import type { ApprovalRequest } from "./services/approvals/types";
import type { Chain, EVMChain, EVMSigner, Owner, SignerForChain, SolanaChain, SolanaSigner } from "./types";

type WalletContructorType<C extends Chain> = {
    chain: C;
    address: string;
    owner: Owner;
    adminSigner: SignerForChain<C>;
};

export class Wallet<C extends Chain> {
    chain: C;
    address: string;
    owner: Owner;
    adminSigner: SignerForChain<C>;
    apiClient: ApiClient;

    constructor(crossmint: Crossmint, { chain, address, owner, adminSigner }: WalletContructorType<C>) {
        this.apiClient = new ApiClient(crossmint);
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.adminSigner = adminSigner;
    }

    public fromAPIResponse(crossmint: Crossmint, { chain, address, owner, adminSigner }: WalletContructorType<C>) {
        return new Wallet(crossmint, {
            chain,
            address,
            owner,
            adminSigner,
        });
    }

    public async balances(tokens: string[]): Promise<WalletBalance> {
        const response = await this.apiClient.getBalance(this.address, {
            chains: this.isSolanaWallet ? undefined : [this.chain],
            tokens,
        });
        if ("error" in response) {
            throw new Error(
                `Failed to get balances for ${
                    this.isSolanaWallet ? "Solana" : "EVM"
                } wallet: ${JSON.stringify(response.error)}`
            );
        }
        return response;
    }

    public async unstable_nfts(params: { perPage: number; page: number }) {
        return await this.apiClient.unstable_getNfts({
            ...params,
            chain: this.chain,
            address: this.address,
        });
    }

    public async unstable_transactions() {
        return await this.apiClient.getTransactions(this.walletLocator);
    }

    public async addDelegatedSigner({
        signer,
    }: {
        signer: string;
    }): Promise<DelegatedSignerDto> {
        if (this.isSolanaWallet) {
            const solanaTxService = new SolanaTransactionsService(this.walletLocator, this.apiClient);
            const delegatedSignerService = new SolanaDelegatedSignerService(
                this.apiClient,
                this.walletLocator,
                solanaTxService
            );

            return await delegatedSignerService.registerDelegatedSigner({
                chain: this.chain as SolanaChain,
                signer,
            });
        } else {
            const delegatedSignerService = new EVMDelegatedSignerService(
                this.apiClient,
                this.walletLocator,
                this.adminSigner as EVMDelegatedSignerService["adminSigner"]
            );

            return await delegatedSignerService.registerDelegatedSigner({
                signer,
                chain: this.chain as EVMChain,
            });
        }
    }

    public async getDelegatedSigners(): Promise<DelegatedSignerDto[]> {
        if (this.isSolanaWallet) {
            const solanaTxService = new SolanaTransactionsService(this.walletLocator, this.apiClient);
            const delegatedSignerService = new SolanaDelegatedSignerService(
                this.apiClient,
                this.walletLocator,
                solanaTxService
            );
            return await delegatedSignerService.getDelegatedSigners();
        } else {
            const delegatedSignerService = new EVMDelegatedSignerService(
                this.apiClient,
                this.walletLocator,
                this.adminSigner as EVMDelegatedSignerService["adminSigner"]
            );
            return await delegatedSignerService.getDelegatedSigners();
        }
    }

    public async permissions() {
        const walletResponse = await this.apiClient.getWallet(this.walletLocator);
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        if (walletResponse.type !== "evm-smart-wallet" && walletResponse.type !== "solana-smart-wallet") {
            throw new WalletTypeNotSupportedError(`Wallet type ${walletResponse.type} not supported`);
        }
        const signers = (walletResponse?.config?.delegatedSigners as unknown as DelegatedSignerDto[]) ?? [];
        return signers;
    }

    protected get walletLocator(): string {
        if (this.apiClient.isServerSide) {
            return this.address;
        } else {
            return `me:${this.isSolanaWallet ? "solana-smart-wallet" : "evm-smart-wallet"}`;
        }
    }

    protected get isSolanaWallet(): boolean {
        return this.chain === "solana";
    }
}

export class EVMWallet extends Wallet<EVMChain> {
    private readonly approvalService: EVMApprovalService;

    constructor(
        crossmint: Crossmint,
        params: {
            chain: EVMChain;
            address: string;
            owner: Owner;
            adminSigner: EVMSigner;
            approvalService: EVMApprovalService;
        }
    ) {
        super(crossmint, params);
        this.approvalService = params.approvalService;
    }

    /**
     * Convert a generic wallet to an EVM wallet
     * @param wallet - A wallet instance with an EVM chain
     * @returns An EVM wallet instance
     */
    public static from(wallet: Wallet<EVMChain>): EVMWallet {
        if (!isValidEVMChain(wallet.chain)) {
            throw new Error("Wallet must be an EVM chain to convert to EVMWallet");
        }
        return new EVMWallet(wallet.apiClient.crossmint, {
            chain: wallet.chain,
            address: wallet.address,
            owner: wallet.owner,
            adminSigner: wallet.adminSigner as EVMSigner,
            approvalService: new EVMApprovalService(
                { apiClient: wallet.apiClient, walletLocator: wallet.address },
                wallet.adminSigner as any
            ),
        });
    }

    public async getNonce(params?: {
        key?: bigint;
        transport?: HttpTransport;
    }) {
        const viemClient = this.getViemClient({
            transport: params?.transport,
        });
        const nonce = await viemClient.readContract({
            abi: entryPointAbi,
            address: ENTRY_POINT_ADDRESS,
            functionName: "getNonce",
            args: [this.address as Address, params?.key ?? BigInt(0)],
        });
        return nonce;
    }

    public async signMessage(params: {
        message: SignableMessage;
    }): Promise<Hex> {
        const messageBytes =
            typeof params.message === "string"
                ? new TextEncoder().encode(params.message)
                : params.message.raw instanceof Uint8Array
                  ? params.message.raw
                  : new Uint8Array(Buffer.from(params.message.raw.slice(2), "hex"));

        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "evm-message",
            params: {
                message: Buffer.from(messageBytes).toString("hex"),
                signer: this.adminSigner.type === "external-wallet" ? this.adminSigner.address : undefined,
                chain: this.chain,
            },
        });

        if ("error" in signatureCreationResponse) {
            throw new Error(`Failed to create signature: ${JSON.stringify(signatureCreationResponse.error)}`);
        }

        // Use approval service to handle the signing and approval
        const approvalRequest: ApprovalRequest = {
            id: signatureCreationResponse.id,
            status: signatureCreationResponse.status,
            pendingApprovals: signatureCreationResponse.approvals?.pending || [],
            submittedApprovals: signatureCreationResponse.approvals?.submitted || [],
        };
        await this.approvalService.approve(approvalRequest);

        // Wait for signature to be ready
        let signatureResponse = null;
        do {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            signatureResponse = await this.apiClient.getSignature(this.walletLocator, signatureCreationResponse.id);
            if ("error" in signatureResponse) {
                throw new Error(`Failed to get signature: ${JSON.stringify(signatureResponse.error)}`);
            }
        } while (signatureResponse === null || signatureResponse.status === "pending");

        if (signatureResponse.status === "failed") {
            throw new Error("Signature failed");
        }

        const response = signatureResponse as unknown as { signature: Hex };
        if (!response.signature) {
            throw new Error("No signature in response");
        }

        return response.signature;
    }

    public async signTypedData<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(params: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
        const { domain, message, primaryType, types } = params;
        if (!domain || !message || !types) {
            throw new Error("Invalid typed data");
        }

        // Extract domain properties with type assertions
        const domainProps = domain as {
            name?: string;
            version?: string;
            chainId?: number | bigint;
            verifyingContract?: `0x${string}`;
            salt?: `0x${string}`;
        };

        if (!domainProps.name || !domainProps.version || !domainProps.chainId || !domainProps.verifyingContract) {
            throw new Error("Invalid typed data domain");
        }

        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "evm-typed-data",
            params: {
                typedData: {
                    domain: {
                        name: domainProps.name,
                        version: domainProps.version,
                        chainId: Number(domainProps.chainId),
                        verifyingContract: domainProps.verifyingContract,
                        salt: domainProps.salt,
                    },
                    message,
                    primaryType,
                    types: types as Record<string, Array<{ name: string; type: string }>>,
                },
                signer: this.adminSigner.type === "external-wallet" ? this.adminSigner.address : undefined,
                chain: this.chain,
                isSmartWalletSignature: false,
            },
        });

        if ("error" in signatureCreationResponse) {
            throw new Error(`Failed to create signature: ${JSON.stringify(signatureCreationResponse.error)}`);
        }

        // Use approval service to handle the signing and approval
        const approvalRequest: ApprovalRequest = {
            id: signatureCreationResponse.id,
            status: signatureCreationResponse.status,
            pendingApprovals: signatureCreationResponse.approvals?.pending || [],
            submittedApprovals: signatureCreationResponse.approvals?.submitted || [],
        };
        await this.approvalService.approve(approvalRequest);

        // Wait for signature to be ready
        let signatureResponse = null;
        do {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            signatureResponse = await this.apiClient.getSignature(this.walletLocator, signatureCreationResponse.id);
            if ("error" in signatureResponse) {
                throw new Error(`Failed to get signature: ${JSON.stringify(signatureResponse.error)}`);
            }
        } while (signatureResponse === null || signatureResponse.status === "pending");

        if (signatureResponse.status === "failed") {
            throw new Error("Signature signing failed");
        }

        const response = signatureResponse as unknown as { signature: Hex };
        if (!response.signature) {
            throw new Error("No signature in response");
        }

        return response.signature;
    }

    public async sendTransaction(params: {
        to: `0x${string}`;
        value?: bigint;
        data?: `0x${string}`;
    }): Promise<Hex> {
        if (this.adminSigner.type !== "external-wallet" || !this.adminSigner.onSignTransaction) {
            throw new Error("Admin signer does not support transaction signing");
        }

        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                calls: [
                    {
                        to: params.to,
                        value: params.value ? params.value.toString() : "0",
                        data: params.data ?? "0x",
                    },
                ],
                signer: this.adminSigner.address,
                chain: this.chain as EVMSmartWalletChain,
            },
        });

        if ("error" in transactionCreationResponse) {
            throw new Error(`Failed to create transaction: ${JSON.stringify(transactionCreationResponse.error)}`);
        }

        // Use approval service to handle the signing and approval
        const approvalRequest: ApprovalRequest = {
            id: transactionCreationResponse.id,
            status: transactionCreationResponse.status,
            pendingApprovals: transactionCreationResponse.approvals?.pending || [],
            submittedApprovals: transactionCreationResponse.approvals?.submitted || [],
        };
        await this.approvalService.approve(approvalRequest);

        // Wait for transaction to be ready
        let transactionResponse = null;
        do {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            transactionResponse = await this.apiClient.getTransaction(
                this.walletLocator,
                transactionCreationResponse.id
            );
            if ("error" in transactionResponse) {
                throw new Error(`Failed to get transaction: ${JSON.stringify(transactionResponse.error)}`);
            }
        } while (transactionResponse === null || transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            throw new Error("Transaction failed");
        }

        return transactionResponse.id as Hex;
    }

    public getViemClient(params?: { transport?: HttpTransport }) {
        return createPublicClient({
            transport: params?.transport ?? http(),
            chain: toViemChain(this.chain as EVMSmartWalletChain),
        });
    }

    protected async signWithAdminSigner(message: Uint8Array): Promise<{ signature: Hex }> {
        if (this.adminSigner.type === "evm-passkey") {
            if (!this.adminSigner.onSignWithPasskey) {
                throw new Error("Passkey signer does not support message signing");
            }
            const signature = await this.adminSigner.onSignWithPasskey(message);
            if (!signature || !(signature instanceof Uint8Array)) {
                throw new Error("Invalid signature from passkey signer");
            }
            return {
                signature: `0x${Buffer.from(signature).toString("hex")}` as Hex,
            };
        } else if (this.adminSigner.type === "external-wallet") {
            if (!this.adminSigner.onSignMessage) {
                throw new Error("External wallet does not support message signing");
            }
            // External wallet expects a hex string
            const messageHex = Buffer.from(message).toString("hex");
            const signature = await this.adminSigner.onSignMessage(messageHex);
            if (!signature || typeof signature !== "string") {
                throw new Error("Invalid signature from external wallet");
            }
            return { signature: signature as Hex };
        }
        throw new Error("Unsupported admin signer type");
    }
}

export class SolanaWallet extends Wallet<SolanaChain> {
    private readonly approvalService: SolanaApprovalService;

    constructor(
        crossmint: Crossmint,
        params: {
            chain: SolanaChain;
            address: string;
            owner: Owner;
            adminSigner: SolanaSigner;
            approvalService: SolanaApprovalService;
        }
    ) {
        super(crossmint, params);
        this.approvalService = params.approvalService;
    }

    /**
     * Convert a generic wallet to a Solana wallet
     * @param wallet - A wallet instance with Solana chain
     * @returns A Solana wallet instance
     */
    public static from(wallet: Wallet<SolanaChain>): SolanaWallet {
        if (wallet.chain !== "solana") {
            throw new Error("Wallet must be a Solana chain to convert to SolanaWallet");
        }
        return new SolanaWallet(wallet.apiClient.crossmint, {
            chain: wallet.chain,
            address: wallet.address,
            owner: wallet.owner,
            adminSigner: wallet.adminSigner as SolanaSigner,
            approvalService: new SolanaApprovalService(
                { apiClient: wallet.apiClient, walletLocator: wallet.address },
                wallet.adminSigner as any
            ),
        });
    }

    public async sendTransaction(params: {
        transaction: VersionedTransaction;
    }): Promise<Hex> {
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction: Buffer.from(params.transaction.serialize()).toString("hex"),
                signer: this.adminSigner.type === "external-wallet" ? this.adminSigner.address : undefined,
            },
        });

        if ("error" in transactionCreationResponse) {
            throw new Error(`Failed to create transaction: ${JSON.stringify(transactionCreationResponse.error)}`);
        }

        // Convert admin signer to SolanaNonCustodialSigner if possible
        if (this.adminSigner.type === "external-wallet") {
            const nonCustodialSigner: SolanaSigner = {
                type: "external-wallet",
                address: this.adminSigner.address,
                onSignTransaction: this.adminSigner.onSignTransaction,
                onSignMessage: this.adminSigner.onSignMessage,
            };

            // Use approval service to handle the signing and approval
            await this.approvalService.approveTransaction(transactionCreationResponse.id, {
                transaction: params.transaction,
                signer: nonCustodialSigner,
            });
        }

        // Wait for transaction to be ready
        let transactionResponse = null;
        do {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            transactionResponse = await this.apiClient.getTransaction(
                this.walletLocator,
                transactionCreationResponse.id
            );
            if ("error" in transactionResponse) {
                throw new Error(`Failed to get transaction: ${JSON.stringify(transactionResponse.error)}`);
            }
        } while (transactionResponse === null || transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            throw new Error("Transaction failed");
        }

        return transactionResponse.id as Hex;
    }
}

export { Crossmint };
export { createCrossmint };
