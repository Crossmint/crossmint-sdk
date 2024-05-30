import { logError, logInfo } from "@/services/logging";
import { SignerMap, SignerType } from "@/types";
import { SCW_SERVICE, TransactionError, TransferError, WalletSdkError, errorToJSON, hasEIP1559Support } from "@/utils";
import { LoggerWrapper } from "@/utils/log";
import {
    KernelAccountClient,
    KernelSmartAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { EntryPoint } from "permissionless/types/entrypoint";
import type { Hash, HttpTransport, PublicClient, SendTransactionParameters, TypedDataDefinition } from "viem";
import { Chain, http, publicActions } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import erc20 from "../../ABI/ERC20.json";
import erc721 from "../../ABI/ERC721.json";
import erc1155 from "../../ABI/ERC1155.json";
import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { getBundlerRPC, getPaymasterRPC, getViemNetwork } from "../BlockchainNetworks";
import { ERC20TransferType, SFTTransferType, TransferType } from "../token";

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
        this.kernelClient = createKernelAccountClient({
            account,
            chain: getViemNetwork(chain),
            entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(hasEIP1559Support(chain) && {
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

    //TODO @matias: review this method.
    // First, I would like to use TransactionRequest from viem instead of ethers.
    // Second, we need to check if chain supports eip-1559 ro not:
    // - If it does, we need to send maxFeePerGas and maxPriorityFeePerGas
    // - If it doesn't, we need to send gasPrice
    // And with the use of viem TransactionRequest, we can specify the TransactionRequest type (eip1559 or legacy) and be more accurate
    public async sendTransaction(
        transaction: SendTransactionParameters<Chain, KernelSmartAccount<EntryPoint, HttpTransport>, Chain>
    ): Promise<Hash> {
        return this.logPerformance("SEND_TRANSACTION", async () => {
            try {
                const txParams = {
                    to: transaction.to,
                    value: transaction.value,
                    gas: transaction.gas,
                    nonce: transaction.nonce,
                    data: transaction.data,
                    ...this.getLegacyTransactionFeesParamsIfApply({
                        maxFeePerGas: transaction.maxFeePerGas,
                        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
                    }),
                };

                logInfo(`[EVMAAWallet - SEND_TRANSACTION] - tx_params: ${JSON.stringify(txParams)}`);

                return await this.kernelClient.sendTransaction(txParams);
            } catch (error) {
                throw new TransactionError(`Error sending transaction: ${error}`);
            }
        });
    }

    public async transfer(toAddress: string, config: TransferType): Promise<string> {
        return this.logPerformance("TRANSFER", async () => {
            const evmToken = config.token;
            const contractAddress = evmToken.contractAddress as `0x${string}`;
            const publicClient = this.kernelClient.extend(publicActions);
            let transaction: Hash;
            let tokenId: string | undefined;

            try {
                switch (evmToken.type) {
                    case "ft": {
                        const { request } = await publicClient.simulateContract({
                            account: this.account,
                            address: contractAddress,
                            abi: erc20,
                            functionName: "transfer",
                            args: [toAddress, (config as ERC20TransferType).amount],
                            ...this.getLegacyTransactionFeesParamsIfApply(),
                        });
                        transaction = await publicClient.writeContract(request);
                        break;
                    }
                    case "sft": {
                        tokenId = evmToken.tokenId;
                        const { request } = await publicClient.simulateContract({
                            account: this.account,
                            address: contractAddress,
                            abi: erc1155,
                            functionName: "safeTransferFrom",
                            args: [this.getAddress(), toAddress, tokenId, (config as SFTTransferType).quantity, "0x00"],
                            ...this.getLegacyTransactionFeesParamsIfApply(),
                        });
                        transaction = await publicClient.writeContract(request);
                        break;
                    }
                    case "nft": {
                        tokenId = evmToken.tokenId;
                        const { request } = await publicClient.simulateContract({
                            account: this.account,
                            address: contractAddress,
                            abi: erc721,
                            functionName: "safeTransferFrom",
                            args: [this.getAddress(), toAddress, tokenId],
                            ...this.getLegacyTransactionFeesParamsIfApply(),
                        });
                        transaction = await publicClient.writeContract(request);
                        break;
                    }
                    default: {
                        throw new WalletSdkError(`Token not supported`);
                    }
                }

                if (transaction != null) {
                    return transaction;
                } else {
                    throw new TransferError(
                        `Error transferring token ${evmToken.contractAddress}
                    ${!tokenId ? "" : ` tokenId=${tokenId}`}
                    ${!transaction ? "" : ` with transaction hash ${transaction}`}`
                    );
                }
            } catch (error) {
                logError("[TRANSFER] - ERROR_TRANSFERRING_TOKEN", {
                    service: SCW_SERVICE,
                    error: errorToJSON(error),
                    tokenId: tokenId,
                    contractAddress: evmToken.contractAddress,
                    chain: evmToken.chain,
                });
                throw new TransferError(
                    `Error transferring token ${evmToken.contractAddress}${tokenId == null ? "" : `:${tokenId}}`}`
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

    private getLegacyTransactionFeesParamsIfApply(gasFeeParams?: {
        maxFeePerGas?: bigint;
        maxPriorityFeePerGas?: bigint;
    }) {
        const { maxFeePerGas, maxPriorityFeePerGas } = gasFeeParams ?? {};

        if (hasEIP1559Support(this.chain)) {
            return {
                // only include if non-null and non-zero
                ...(maxFeePerGas && { maxFeePerGas }),
                ...(maxPriorityFeePerGas && { maxPriorityFeePerGas }),
            };
        } else {
            if (maxFeePerGas || maxPriorityFeePerGas) {
                console.warn(
                    "maxFeePerGas and maxPriorityFeePerGas are not supported on this chain as it supports Legacy Transacitons. Ignoring them."
                );
            }

            // Since there's no bundler support for Polygon CDK chains yet, ZD relies on Gelato, which requires some special configuration
            // https://docs.zerodev.app/sdk/faqs/use-with-gelato#transaction-configuration
            // TODO: Looks like we're checking the wrong condition here, we should check for ZD using Gelato rather than 1559 support.
            return {
                maxFeePerGas: "0x0" as any,
                maxPriorityFeePerGas: "0x0" as any,
            };
        }
    }
}
