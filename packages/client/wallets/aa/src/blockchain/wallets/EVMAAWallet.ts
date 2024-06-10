import { logError, logInfo } from "@/services/logging";
import {
    SCW_SERVICE,
    TransactionError,
    TransferError,
    WalletSdkError,
    convertData,
    decorateSendTransactionData,
    errorToJSON,
    gelatoBundlerProperties,
    getNonce,
    hasEIP1559Support,
    usesGelatoBundler,
} from "@/utils";
import { resolveDeferrable } from "@/utils/deferrable";
import { LoggerWrapper } from "@/utils/log";
import type { Deferrable } from "@ethersproject/properties";
import { type TransactionRequest } from "@ethersproject/providers";
import { KernelAccountClient, KernelSmartAccount, createKernelAccountClient } from "@zerodev/sdk";
import { BigNumberish } from "ethers";
import { SmartAccountClient } from "permissionless";
import { SmartAccount } from "permissionless/accounts";
import { EntryPoint } from "permissionless/types/entrypoint";
import type { Hash, HttpTransport, PublicClient, TypedDataDefinition } from "viem";
import { Chain, http, publicActions } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import erc20 from "../../ABI/ERC20.json";
import erc721 from "../../ABI/ERC721.json";
import erc1155 from "../../ABI/ERC1155.json";
import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { getBundlerRPC, getViemNetwork } from "../BlockchainNetworks";
import { ERC20TransferType, SFTTransferType, TransferType } from "../token";
import { paymasterMiddleware } from "./paymaster";
import { toCrossmintSmartAccountClient } from "./smartAccount";

export class EVMAAWallet extends LoggerWrapper {
    public readonly chain: EVMBlockchainIncludingTestnet;
    public readonly publicClient: PublicClient;
    private readonly smartAccountClient: KernelAccountClient<
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

        const kernelClient: KernelAccountClient<
            EntryPoint,
            HttpTransport,
            Chain,
            KernelSmartAccount<EntryPoint, HttpTransport>
        > = createKernelAccountClient({
            account,
            chain: getViemNetwork(chain),
            entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(!usesGelatoBundler(chain) && paymasterMiddleware({ entryPoint, chain })),
        });

        this.smartAccountClient = toCrossmintSmartAccountClient({
            smartAccountClient: kernelClient,
            crossmintChain: chain,
        });
        this.chain = chain;
        this.publicClient = publicClient;
    }

    public getAddress() {
        return this.smartAccountClient.account.address;
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

                return await this.smartAccountClient.signMessage({
                    message: messageAsString,
                });
            } catch (error) {
                throw new Error(`Error signing message. If this error persists, please contact support.`);
            }
        });
    }

    public async signTypedData(params: TypedDataDefinition) {
        return this.logPerformance("SIGN_TYPED_DATA", async () => {
            return await this.smartAccountClient.signTypedData(params);
        });
    }

    //TODO @matias: review this method.
    // First, I would like to use TransactionRequest from viem instead of ethers.
    // Second, we need to check if chain supports eip-1559 ro not:
    // - If it does, we need to send maxFeePerGas and maxPriorityFeePerGas
    // - If it doesn't, we need to send gasPrice
    // And with the use of viem TransactionRequest, we can specify the TransactionRequest type (eip1559 or legacy) and be more accurate
    public async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<Hash> {
        return this.logPerformance("SEND_TRANSACTION", async () => {
            try {
                const decoratedTransaction = await decorateSendTransactionData(transaction);
                const { to, value, gasLimit, nonce, data, maxFeePerGas, maxPriorityFeePerGas } =
                    await resolveDeferrable(decoratedTransaction);

                const txParams = {
                    to: to as `0x${string}`,
                    value: value ? BigInt(value.toString()) : undefined,
                    gas: gasLimit ? BigInt(gasLimit.toString()) : undefined,
                    nonce: await getNonce(nonce),
                    data: await convertData(data),
                    ...this.getLegacyTransactionFeesParamsIfApply({ maxFeePerGas, maxPriorityFeePerGas }),
                };

                logInfo(`[EVMAAWallet - SEND_TRANSACTION] - tx_params: ${JSON.stringify(txParams)}`);

                return await this.smartAccountClient.sendTransaction(txParams);
            } catch (error) {
                throw new TransactionError(`Error sending transaction: ${error}`);
            }
        });
    }

    public async transfer(toAddress: string, config: TransferType): Promise<string> {
        return this.logPerformance("TRANSFER", async () => {
            const evmToken = config.token;
            const contractAddress = evmToken.contractAddress as `0x${string}`;
            const publicClient = this.smartAccountClient.extend(publicActions);
            let transaction;
            let tokenId;
            try {
                switch (evmToken.type) {
                    case "ft": {
                        const { request } = await publicClient.simulateContract({
                            account: this.account,
                            address: contractAddress,
                            abi: erc20,
                            functionName: "transfer",
                            args: [toAddress, (config as ERC20TransferType).amount],
                            ...(usesGelatoBundler(this.chain) && gelatoBundlerProperties),
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
                            ...(usesGelatoBundler(this.chain) && gelatoBundlerProperties),
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
                            ...(usesGelatoBundler(this.chain) && gelatoBundlerProperties),
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

    public getSigner(type: "viem" = "viem"): {
        publicClient: PublicClient;
        walletClient: SmartAccountClient<EntryPoint, HttpTransport, Chain, SmartAccount<EntryPoint>>;
    } {
        switch (type) {
            case "viem": {
                return {
                    publicClient: this.publicClient,
                    walletClient: this.smartAccountClient,
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
        maxFeePerGas?: BigNumberish;
        maxPriorityFeePerGas?: BigNumberish;
    }) {
        const { maxFeePerGas, maxPriorityFeePerGas } = gasFeeParams ?? {};

        if (hasEIP1559Support(this.chain)) {
            return {
                // only include if non-null and non-zero
                ...(maxFeePerGas && { maxFeePerGas: BigInt(maxFeePerGas.toString()) }),
                ...(maxPriorityFeePerGas && { maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas.toString()) }),
            };
        } else {
            if (maxFeePerGas || maxPriorityFeePerGas) {
                console.warn(
                    "maxFeePerGas and maxPriorityFeePerGas are not supported on this chain as it supports Legacy Transacitons. Ignoring them."
                );
            }
            return gelatoBundlerProperties;
        }
    }
}
