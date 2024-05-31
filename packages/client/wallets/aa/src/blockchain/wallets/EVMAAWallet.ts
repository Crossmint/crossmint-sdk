import { logError } from "@/services/logging";
import { SignerMap, SignerType } from "@/types";
import {
    SCW_SERVICE,
    TransferError,
    WalletSdkError,
    errorToJSON,
    gelatoBundlerProperties,
    usesGelatoBundler,
} from "@/utils";
import { LoggerWrapper } from "@/utils/log";
import {
    KernelAccountClient,
    KernelSmartAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { EntryPoint } from "permissionless/types/entrypoint";
import type { Hash, HttpTransport, PublicClient, TypedDataDefinition } from "viem";
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
