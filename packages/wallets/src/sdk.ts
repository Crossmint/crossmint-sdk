import { type Crossmint, createCrossmint } from "@crossmint/common-sdk-base";
import type { VersionedTransaction } from "@solana/web3.js";
import {
    concat,
    type HttpTransport,
    type Hex,
    type Address,
    type SignableMessage,
    createPublicClient,
    http,
    type TypedDataDefinition,
    type TypedData,
} from "viem";
import { WebAuthnP256 } from "ox";

import { ApiClient, type WalletBalance } from "./api";
import { WalletFactory } from "./services/wallet-factory";
import type { WalletTypeToArgs, WalletTypeToWallet } from "./services/types";
import type { WalletOptions } from "./utils/options";
import { abi as entryPointAbi, toViemChain, type EVMSmartWalletChain, type TransactionInput } from "./evm";
import {
    MessageSigningNotSupportedError,
    TransactionConfirmationTimeoutError,
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
} from "./utils/errors";
import { SolanaTransactionsService } from "./solana/services/transactions-service";
import type { SolanaNonCustodialSigner, SolanaSupportedToken } from "./solana";
import { ENTRY_POINT_ADDRESS, STATUS_POLLING_INTERVAL_MS } from "./utils/constants";
import { sleep } from "./utils";

type WalletType = keyof WalletTypeToArgs;

// Chains
type SolanaChain = "solana";
type EVMChain = EVMSmartWalletChain;

// Signers
type BaseSigner =
    | {
          type: "email";
          onAuthRequired?: (
              sendEmailWithOtp: (email: string) => Promise<void>,
              verifyOtp: (otp: string) => Promise<void>,
              reject: (error: Error) => void
          ) => Promise<void>;
      }
    | { type: "api-key" }; // Only used in the server

type SolanaSigner = {
    type: "external-wallet";
    address: string;
    onSignMessage: (message: Uint8Array) => Promise<Uint8Array>;
    onSignTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};

type EVMSigner =
    | {
          type: "passkey";
          name: string;
          id: string;
          onCreatePasskey?: string;
          onSignWithPasskey?: (message: Uint8Array) => Promise<Uint8Array>;
      }
    | {
          type: "external-wallet";
          address: string;
          onSignMessage: (message: string) => Promise<Hex>;
          onSignTransaction: (params: TransactionInput) => Promise<Hex>;
      };

type SignerForChain<C extends Chain> = C extends SolanaChain ? SolanaSigner | BaseSigner : EVMSigner | BaseSigner;

type DelegatedSigner = SignerForChain<Chain>;

type Permission = {
    signer: DelegatedSigner;
};

type Chain = SolanaChain | EVMChain;

// Owner
type OwnerKey = "email" | "userId" | "x" | "phone";

type Owner =
    | {
          [K in OwnerKey]: { [P in K]: string };
      }[OwnerKey]
    | string;

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

    /**
     * Get the wallet balances
     * @param {string[]} params.tokens - The tokens
     * @returns {Promise<WalletBalance>} The balances
     * @throws {Error} If the balances cannot be retrieved
     */
    public async balances(tokens: string[]): Promise<WalletBalance> {
        const response = await this.apiClient.getBalance(this.address, {
            chains: this.isSolanaWallet ? undefined : [this.chain],
            tokens,
        });
        if ("error" in response) {
            throw new Error(
                `Failed to get balances for ${this.isSolanaWallet ? "Solana" : "EVM"} wallet: ${JSON.stringify(response.error)}`
            );
        }
        return response;
    }

    /**
     * Get the wallet NFTs
     * @param {Object} params - The parameters
     * @param {number} params.perPage - The number of NFTs per page
     * @param {number} params.page - The page number
     * @param {EvmWalletLocator} [params.locator] - The locator
     * @returns The NFTs
     * @unstable This API is unstable and may change in the future
     */
    public async unstable_nfts(params: {
        perPage: number;
        page: number;
    }) {
        return await this.apiClient.unstable_getNfts({
            ...params,
            chain: this.chain,
            address: this.address,
        });
    }

    /**
     * Get the wallet transactions
     * @returns The transactions
     */
    public async unstable_transactions() {
        return await this.apiClient.getTransactions(this.walletLocator);
    }

    // async grantPermission({ to: DelegatedSigner | string });
    /**
     * Add a delegated signer to the wallet
     * @param signer - The signer
     * @returns The delegated signer
     */
    public async grantPermission({ to }: { to: DelegatedSigner | string }) {
        // 1. Call register signer
        // 2. Get approval, sign it and approve transaction
        // 3. Poll and wait for approval
        // 4. Return delegated signer

        // Convert string address to DelegatedSigner if needed
        const signerAddress = typeof to === "string" ? to : to.type === "external-wallet" ? to.address : to;

        if (this.isSolanaWallet) {
            const solanaTxService = new SolanaTransactionsService(this.walletLocator, this.apiClient);
            const response = await this.apiClient.registerSigner(this.walletLocator, {
                signer: signerAddress.toString(),
            });

            // Check if the transaction requires approval
            if ("transaction" in response && response.transaction?.id) {
                const transactionId = response.transaction.id;
                // Get admin signer to approve the transaction
                const adminSigner =
                    this.adminSigner.type === "external-wallet"
                        ? ({
                              type: "solana-keypair",
                              address: this.adminSigner.address,
                              signTransaction: this.adminSigner.onSignTransaction,
                              signMessage: this.adminSigner.onSignMessage,
                          } as SolanaNonCustodialSigner)
                        : undefined;
                // Approve and wait for transaction
                if (adminSigner != null) {
                    await solanaTxService.approveTransaction(transactionId, [adminSigner]);
                    await solanaTxService.waitForTransaction(transactionId);
                }
            }

            // Return the delegated signer
            return await this.apiClient.getSigner(this.walletLocator, signerAddress.toString());
        } else {
            const chain = this.chain as EVMSmartWalletChain;
            const response = (await this.apiClient.registerSigner(this.walletLocator, {
                signer: signerAddress.toString(),
                chain,
            })) as Extract<
                Awaited<ReturnType<typeof this.apiClient.registerSigner>>,
                {
                    type: "evm-keypair" | "evm-fireblocks-custodial" | "evm-passkey";
                    locator: string;
                    chains?: {
                        [key: string]:
                            | {
                                  status: "success";
                              }
                            | {
                                  status: "pending" | "awaiting-approval" | "failed";
                                  id: string;
                                  approvals?: {
                                      pending: Array<{
                                          signer: string;
                                          message: string;
                                      }>;
                                      submitted: Array<{
                                          signature: string;
                                          submittedAt: number;
                                          signer: string;
                                          message: string;
                                      }>;
                                  };
                              };
                    };
                }
            >;
            // Check if the response needs approval
            const chainResponse =
                response.type === "evm-keypair" ||
                response.type === "evm-fireblocks-custodial" ||
                response.type === "evm-passkey"
                    ? response.chains?.[chain]
                    : undefined;

            if (chainResponse?.status === "awaiting-approval" && chainResponse.id && chainResponse.approvals?.pending) {
                const approvalId = chainResponse.id;
                const pendingApprovals = chainResponse.approvals.pending;
                // Process approvals if the admin signer is an external wallet
                if (this.adminSigner.type === "external-wallet") {
                    // Type guard to ensure adminSigner has the required methods
                    if (!("onSignMessage" in this.adminSigner)) {
                        throw new Error("Admin signer does not support message signing");
                    }
                    const approvals = await Promise.all(
                        pendingApprovals.map(async (approval) => {
                            // Type assertion since we've verified onSignMessage exists
                            const signature = await (
                                this.adminSigner as { onSignMessage: (message: string) => Promise<string> }
                            ).onSignMessage(approval.message);
                            return {
                                signer: approval.signer,
                                signature,
                            };
                        })
                    );
                    await this.apiClient.approveSignature(this.walletLocator, approvalId, { approvals });
                    const startTime = Date.now();
                    const timeoutMs = 60000; // 60 seconds timeout
                    let signatureResponse;
                    do {
                        if (Date.now() - startTime > timeoutMs) {
                            throw new TransactionConfirmationTimeoutError("Approval confirmation timeout");
                        }

                        signatureResponse = await this.apiClient.getSigner(
                            this.walletLocator,
                            signerAddress.toString()
                        );

                        if ("error" in signatureResponse) {
                            throw new WalletNotAvailableError(JSON.stringify(signatureResponse));
                        }
                        await sleep(STATUS_POLLING_INTERVAL_MS);
                    } while (
                        "chains" in signatureResponse &&
                        (signatureResponse.chains?.[chain]?.status === "awaiting-approval" ||
                            signatureResponse.chains?.[chain]?.status === "pending")
                    );
                    if ("chains" in signatureResponse && signatureResponse.chains?.[chain]?.status === "failed") {
                        throw new Error(
                            `Signer registration failed: ${JSON.stringify(signatureResponse.chains?.[chain])}`
                        );
                    }
                }
            }
            return await this.apiClient.getSigner(this.walletLocator, signerAddress.toString());
        }
    }

    // TODO: Make sure response returns Permissions and changes the signer types (evm-keypair -> external-wallet)
    public async permissions() {
        const walletResponse = await this.apiClient.getWallet(this.walletLocator);
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        if (walletResponse.type !== "evm-smart-wallet" && walletResponse.type !== "solana-smart-wallet") {
            throw new WalletTypeNotSupportedError(`Wallet type ${walletResponse.type} not supported`);
        }
        const signers = (walletResponse?.config?.delegatedSigners as unknown as DelegatedSigner[]) ?? [];
        return signers;
    }

    // non-custodial signer flow
    private emailSignMessageFallback() {
        // check needs auth, if so, call onAuthRequired
        // iframe communication to sign message
        // return signed message
    }

    private passKeySignMessageFallback() {}

    protected async signWithAdminSigner(message: Uint8Array & string) {
        if (this.adminSigner.type === "api-key") {
            throw new Error("Admin signer is not supported for API key");
        }

        if (this.adminSigner.type === "email") {
            // TODO: Implement email sign message fallback
        }

        if (this.adminSigner.type === "passkey") {
            // If onSignWithPasskey is set call that
            if (this.adminSigner.onSignWithPasskey) {
                return this.adminSigner.onSignWithPasskey(message);
            }
            // If not set, use webauthn
            if (this.isSolanaWallet) {
                // TODO: Implement solana passkey signing
            } else {
                const { metadata, signature } = await WebAuthnP256.sign({
                    credentialId: this.adminSigner.id,
                    challenge: message as `0x${string}`,
                });

                return {
                    signature: concat([`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`]),
                    metadata,
                };
            }
        }

        if (this.adminSigner.type === "external-wallet") {
            if (!this.adminSigner.onSignMessage) {
                throw new MessageSigningNotSupportedError("Account does not support onSignMessage");
            }
            const signature = await this.adminSigner.onSignMessage(message);
            return { signature };
        }
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
    static from(wallet: Wallet<EVMChain>) {
        const crossmintInstance = wallet.apiClient.crossmint;
        return new EVMWallet(crossmintInstance, {
            chain: wallet.chain,
            address: wallet.address,
            owner: wallet.owner,
            adminSigner: wallet.adminSigner,
        });
    }

    public async getBalances(params: { tokens: string[] }) {
        return await this.balances(params.tokens);
    }

    public async getTransactions() {
        return await this.unstable_transactions();
    }

    public async unstable_getNfts(params: { perPage: number; page: number }) {
        return await this.unstable_nfts(params);
    }

    public async getNonce(params?: { key?: bigint; transport?: HttpTransport }) {
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

    public async signMessage(params: { message: SignableMessage }): Promise<Hex> {
        // @todo: Implement
        throw new Error("Method not implemented");
    }

    public async signTypedData<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(params: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
        // @todo: Implement
        throw new Error("Method not implemented");
    }

    public async sendTransaction(params: TransactionInput): Promise<Hex> {
        // @todo: Implement
        throw new Error("Method not implemented");
    }

    public getViemClient(params?: { transport?: HttpTransport }) {
        return createPublicClient({
            transport: params?.transport ?? http(),
            chain: toViemChain(this.chain),
        });
    }

    public async addDelegatedSigner(signer: string) {
        return await this.grantPermission({ to: signer });
    }

    public async getDelegatedSigners() {
        return await this.permissions();
    }
}

export class SolanaWallet extends Wallet<SolanaChain> {
    static from(wallet: Wallet<SolanaChain>) {
        const crossmintInstance = wallet.apiClient.crossmint;
        return new SolanaWallet(crossmintInstance, {
            chain: "solana",
            address: wallet.address,
            owner: wallet.owner,
            adminSigner: wallet.adminSigner,
        });
    }

    public async getBalances(params: {
        tokens: SolanaSupportedToken[];
    }) {
        return await this.balances(params.tokens);
    }

    public async getTransactions() {
        return await this.unstable_transactions();
    }

    public async unstable_getNfts(params: { perPage: number; page: number }) {
        return await this.unstable_nfts(params);
    }

    public async sendTransaction(params: TransactionInput): Promise<Hex> {
        // @todo: Implement
        throw new Error("Method not implemented");
    }

    public async addDelegatedSigner(signer: string) {
        return await this.grantPermission({ to: signer });
    }

    public async getDelegatedSigners() {
        return await this.permissions();
    }
}

/***********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 *            REGULAR SDK DOWN BELOW
 * *********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 * *********************************************
 */

export class CrossmintWallets {
    private readonly walletFactory: WalletFactory;

    private constructor(crossmint: Crossmint) {
        const apiClient = new ApiClient(crossmint);
        this.walletFactory = new WalletFactory(apiClient);
    }

    /**
     * Initialize the Wallets SDK
     * @param crossmint - Crossmint data (use `createCrossmint` to initialize)
     * @returns A new CrossmintWallets instance
     */
    public static from(crossmint: Crossmint): CrossmintWallets {
        return new CrossmintWallets(crossmint);
    }

    /**
     * Get or create a wallet
     * @param type - Wallet type
     * @param args - Wallet data
     * @param options - Wallet options
     * @returns A new wallet
     */
    public getOrCreateWallet<T extends WalletType>(
        type: T,
        args: WalletTypeToArgs[T],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[T]> {
        return this.walletFactory.getOrCreateWallet(type, args, options);
    }

    /**
     * Get an existing wallet by address
     * @param address - Wallet address
     * @param type - Wallet type
     * @param args - Wallet data
     * @param options - Wallet options
     * @returns A wallet
     */
    public getWallet<T extends WalletType>(
        address: string,
        type: T,
        args: WalletTypeToArgs[T],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[T]> {
        return this.walletFactory.getWallet(address, type, args, options);
    }
}

export { Crossmint };
export { createCrossmint };
