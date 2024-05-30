import { logError, logInfo } from "@/services/logging";
import { SignerMap, SignerType } from "@/types";
import { SCW_SERVICE, TransactionError, TransferError, errorToJSON, usesGelatoBundler } from "@/utils";
import { LoggerWrapper } from "@/utils/log";
import {
    KernelAccountClient,
    KernelSmartAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { EntryPoint } from "permissionless/types/entrypoint";
import type {
    HttpTransport,
    PublicClient,
    SendTransactionParameters,
    TransactionReceipt,
    TypedDataDefinition,
} from "viem";
import { Chain, http, isAddress, isHex, publicActions } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { getBundlerRPC, getPaymasterRPC, getViemNetwork } from "../BlockchainNetworks";
import { TransferType, transferParams } from "../token";

export class EVMAAWallet extends LoggerWrapper {
    public readonly chain: EVMBlockchainIncludingTestnet;
    public readonly publicClient: PublicClient;
    private readonly kernelClient: KernelAccountClient<
        EntryPoint,
        HttpTransport,
        Chain,
        KernelSmartAccount<EntryPoint, HttpTransport>
    >;

    constructor(
        private readonly account: KernelSmartAccount<EntryPoint, HttpTransport>,
        private readonly crossmintService: CrossmintWalletService,
        publicClient: PublicClient<HttpTransport>,
        entryPoint: EntryPoint,
        chain: EVMBlockchainIncludingTestnet
    ) {
        super("EVMAAWallet", { chain, address: account.address });

        const shouldSponsor = !usesGelatoBundler(chain);
        this.kernelClient = createKernelAccountClient({
            account,
            chain: getViemNetwork(chain),
            entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(shouldSponsor && {
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        const paymasterClient = createZeroDevPaymasterClient({
                            chain: getViemNetwork(chain),
                            transport: http(getPaymasterRPC(chain)),
                            entryPoint,
                        });
                        return paymasterClient.sponsorUserOperation({
                            userOperation,
                            entryPoint,
                        });
                    },
                },
            }),
        });
        this.chain = chain;
        this.publicClient = publicClient;
    }

    public getAddress() {
        return this.kernelClient.account.address;
    }

    public async signMessage(message: string | Uint8Array) {
        return this.logPerformance("SIGN_MESSAGE", async () => {
            try {
                let messageAsString: string;
                if (message instanceof Uint8Array) {
                    const decoder = new TextDecoder();
                    messageAsString = decoder.decode(message);
                } else {
                    messageAsString = message;
                }

                return await this.kernelClient.signMessage({
                    message: messageAsString,
                });
            } catch (error) {
                throw new Error(`Error signing message. If this error persists, please contact support.`);
            }
        });
    }

    public async signTypedData(params: TypedDataDefinition) {
        return this.logPerformance("SIGN_TYPED_DATA", async () => {
            try {
                return await this.kernelClient.signTypedData(params);
            } catch (error) {
                throw new Error(`Error signing typed data. If this error persists, please contact support.`);
            }
        });
    }

    public async sendTransaction({
        to,
        value,
        data,
    }: {
        to: string;
        value: bigint;
        data?: string;
    }): Promise<TransactionReceipt> {
        return this.logPerformance("SEND_TRANSACTION", async () => {
            if (!isAddress(to)) {
                throw new Error("Invalid recipient address: '${to}' is not a valid EVM address.");
            }

            if (data != null && !isHex(data)) {
                throw new Error("Invalid Hex: '${data}' is not valid Hex address.");
            }

            try {
                const txParams: SendTransactionParameters<Chain, KernelSmartAccount<EntryPoint, HttpTransport>> = {
                    to,
                    value,
                    data,
                    ...(usesGelatoBundler(this.chain) && {
                        maxFeePerGas: "0x0" as any,
                        maxPriorityFeePerGas: "0x0" as any,
                    }),
                };

                logInfo(`[EVMAAWallet - SEND_TRANSACTION] - tx_params: ${JSON.stringify(txParams)}`);
                const hash = await this.kernelClient.sendTransaction(txParams);
                return this.publicClient.waitForTransactionReceipt({ hash });
            } catch (error) {
                throw new TransactionError(`Error sending transaction: ${error}`);
            }
        });
    }

    public async transfer({ to, config }: { to: string; config: TransferType }): Promise<TransactionReceipt> {
        return this.logPerformance("TRANSFER", async () => {
            if (this.chain !== config.token.chain) {
                throw new Error(
                    `Chain mismatch: Expected ${config.token.chain}, but got ${this.chain}. Ensure you are interacting with the correct blockchain.`
                );
            }

            if (!isAddress(to)) {
                throw new Error(`Invalid recipient address: '${to}' is not a valid EVM address.`);
            }

            if (!isAddress(config.token.contractAddress)) {
                throw new Error(
                    `Invalid contract address: '${config.token.contractAddress}' is not a valid EVM address.`
                );
            }

            const publicClient = this.kernelClient.extend(publicActions);
            const txParams = {
                ...transferParams({ contract: config.token.contractAddress, to, from: this.account, config }),
                ...(usesGelatoBundler(this.chain) && {
                    maxFeePerGas: "0x0" as any,
                    maxPriorityFeePerGas: "0x0" as any,
                }),
            };

            try {
                const { request } = await publicClient.simulateContract(txParams);
                const hash = await publicClient.writeContract(request);
                return publicClient.waitForTransactionReceipt({ hash });
            } catch (error) {
                logError("[TRANSFER] - ERROR_TRANSFERRING_TOKEN", {
                    service: SCW_SERVICE,
                    error: errorToJSON(error),
                    tokenId: txParams.tokenId,
                    contractAddress: config.token.contractAddress,
                    chain: config.token.chain,
                });
                throw new TransferError(
                    `Error transferring token ${config.token.contractAddress}${
                        txParams.tokenId == null ? "" : `:${txParams.tokenId}}`
                    }`
                );
            }
        });
    }

    public getSigner<Type extends SignerType>(type: Type): SignerMap[Type] {
        switch (type) {
            case "viem": {
                return {
                    publicClient: this.publicClient,
                    walletClient: this.kernelClient,
                };
            }
            default:
                logError("[GET_SIGNER] - ERROR", {
                    service: SCW_SERVICE,
                    error: errorToJSON("Invalid signer type"),
                });
                throw new Error("Invalid signer type");
        }
    }

    public async getNFTs() {
        return this.logPerformance("GET_NFTS", async () => {
            return this.crossmintService.fetchNFTs(this.account.address, this.chain);
        });
    }
}
