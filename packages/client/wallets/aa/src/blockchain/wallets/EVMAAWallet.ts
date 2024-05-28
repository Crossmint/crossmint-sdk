import { logError } from "@/services/logging";
import { GenerateSignatureDataInput, SignerMap, SignerType } from "@/types";
import { SCW_SERVICE, TransferError, WalletSdkError, errorToJSON, hasEIP1559Support } from "@/utils";
import { LoggerWrapper } from "@/utils/log";
import type { KernelValidator } from "@zerodev/ecdsa-validator";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import type { KernelSmartAccount } from "@zerodev/sdk";
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { walletClientToSmartAccountSigner } from "permissionless";
import { EntryPoint } from "permissionless/types/entrypoint";
import type { HttpTransport, PublicClient, TypedDataDefinition } from "viem";
import { Hex, createWalletClient, custom, http, publicActions } from "viem";
import { Web3 } from "web3";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import erc20 from "../../ABI/ERC20.json";
import erc721 from "../../ABI/ERC721.json";
import erc1155 from "../../ABI/ERC1155.json";
import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import {
    TChain,
    entryPoint,
    getBundlerRPC,
    getPaymasterRPC,
    getUrlProviderByBlockchain,
    getViemNetwork,
} from "../BlockchainNetworks";
import { Custodian } from "../plugins";
import { ERC20TransferType, SFTTransferType, TokenType, TransferType } from "../token";

export class EVMAAWallet extends LoggerWrapper {
    private sessionKeySignerAddress?: Hex;
    private crossmintService: CrossmintWalletService;
    private publicClient: PublicClient;
    private ecdsaValidator: KernelValidator<entryPoint, "ECDSAValidator">;
    private account: KernelSmartAccount<EntryPoint, HttpTransport, TChain>;
    private kernelClient: ReturnType<
        typeof createKernelAccountClient<
            EntryPoint,
            HttpTransport,
            TChain,
            KernelSmartAccount<EntryPoint, HttpTransport, TChain>
        >
    >;
    private entryPoint: EntryPoint;
    chain: EVMBlockchainIncludingTestnet;

    constructor(
        account: KernelSmartAccount<EntryPoint, HttpTransport, TChain>,
        crossmintService: CrossmintWalletService,
        chain: EVMBlockchainIncludingTestnet,
        publicClient: PublicClient,
        ecdsaValidator: KernelValidator<entryPoint, "ECDSAValidator">,
        entryPoint: EntryPoint
    ) {
        super("EVMAAWallet", { chain, address: account.address });
        this.chain = chain;
        this.crossmintService = crossmintService;
        this.publicClient = publicClient;
        this.ecdsaValidator = ecdsaValidator;

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
        this.account = account;
        this.entryPoint = entryPoint;
    }

    getAddress() {
        return this.kernelClient.account.address;
    }

    async signMessage(message: string | Uint8Array) {
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

    async signTypedData(params: TypedDataDefinition) {
        return this.logPerformance("SIGN_TYPED_DATA", async () => {
            try {
                return await this.kernelClient.signTypedData(params);
            } catch (error) {
                throw new Error(`Error signing typed data. If this error persists, please contact support.`);
            }
        });
    }

    async transfer(toAddress: string, config: TransferType): Promise<string> {
        return this.logPerformance("TRANSFER", async () => {
            const evmToken = config.token;
            const contractAddress = evmToken.contractAddress as `0x${string}`;
            const publicClient = this.kernelClient.extend(publicActions);
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

    getSigner<Type extends SignerType>(type: Type): SignerMap[Type] {
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

    setSessionKeySignerAddress(sessionKeySignerAddress: Hex) {
        this.sessionKeySignerAddress = sessionKeySignerAddress;
    }

    async setCustodianForTokens(tokenType?: TokenType, custodian?: Custodian) {
        return this.logPerformance("SET_CUSTODIAN_FOR_TOKENS", async () => {
            try {
                const rpcProvider = getUrlProviderByBlockchain(this.chain);
                const web3 = new Web3(rpcProvider);

                if (web3.provider == null) {
                    throw new Error("Web3 provider is not available");
                }

                const walletClientSigner = createWalletClient({
                    chain: getViemNetwork(this.chain),
                    account: this.sessionKeySignerAddress!,
                    transport: custom(web3.provider),
                });

                const smartAccountSigner = walletClientToSmartAccountSigner(walletClientSigner);
                const sessionKeySigner = toECDSASigner({
                    signer: smartAccountSigner,
                });

                const sessionKeyValidator = await toPermissionValidator(this.publicClient, {
                    entryPoint: this.entryPoint,
                    signer: sessionKeySigner,
                    policies: [],
                });

                const sessionKeyAccount = await createKernelAccount(this.publicClient, {
                    entryPoint: this.entryPoint,
                    plugins: {
                        sudo: this.ecdsaValidator,
                        regular: sessionKeyValidator,
                    },
                });
                const serializedSessionKeyAccount = await serializePermissionAccount(sessionKeyAccount);

                const generateSessionKeyDataInput: GenerateSignatureDataInput = {
                    sessionKeyData: serializedSessionKeyAccount,
                    smartContractWalletAddress: this.kernelClient.account.address,
                    chain: this.chain,
                    version: 0,
                };
                await this.crossmintService.generateChainData(generateSessionKeyDataInput);
            } catch (error) {
                throw new Error(`Error setting custodian for tokens. If this error persists, please contact support.`);
            }
        });
    }

    async getNFTs() {
        return this.logPerformance("GET_NFTS", async () => {
            return this.crossmintService.fetchNFTs(this.account.address, this.chain);
        });
    }
}
