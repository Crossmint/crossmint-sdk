import { logError, logInfo } from "@/services/logging";
import { GenerateSignatureDataInput, SignerMap, SignerType } from "@/types";
import {
    SCW_SERVICE,
    TransactionError,
    convertData,
    decorateSendTransactionData,
    errorToJSON,
    getNonce,
} from "@/utils";
import type { Deferrable } from "@ethersproject/properties";
import { type TransactionRequest } from "@ethersproject/providers";
import {
    KernelSmartAccount,
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import type { KernelAccountClient, KernelValidator } from "@zerodev/sdk";
import { oneAddress, serializeSessionKeyAccount, signerToSessionKeyValidator } from "@zerodev/session-key";
import { UserOperation, walletClientToSmartAccountSigner } from "permissionless";
import { Hex, createWalletClient, custom, http, publicActions } from "viem";
import type { Chain, EIP1193Provider, Hash, PublicClient, Transport, TypedDataDefinition } from "viem";
import { Web3 } from "web3";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { getBundlerRPC, getPaymasterRPC, getUrlProviderByBlockchain, getViemNetwork } from "../BlockchainNetworks";
import { Custodian } from "../plugins";
import { TokenType } from "../token";

export class EVMAAWallet<B extends EVMBlockchainIncludingTestnet = EVMBlockchainIncludingTestnet> {
    private sessionKeySignerAddress?: Hex;
    private crossmintService: CrossmintWalletService;
    private publicClient: PublicClient;
    private ecdsaValidator: KernelValidator<"ECDSAValidator">;
    private account: KernelSmartAccount;
    kernelClient: KernelAccountClient<Transport, Chain, KernelSmartAccount>;
    chain: B;

    constructor(
        account: KernelSmartAccount,
        crossmintService: CrossmintWalletService,
        chain: B,
        publicClient: PublicClient,
        ecdsaValidator: KernelValidator<"ECDSAValidator">
    ) {
        this.chain = chain;
        this.crossmintService = crossmintService;
        this.publicClient = publicClient;
        this.ecdsaValidator = ecdsaValidator;
        this.kernelClient = createKernelAccountClient({
            account,
            chain: getViemNetwork(chain as EVMBlockchainIncludingTestnet),
            transport: http(getBundlerRPC(chain)),
            sponsorUserOperation: async ({ userOperation }): Promise<UserOperation> => {
                const paymasterClient = createZeroDevPaymasterClient({
                    chain: getViemNetwork(chain as EVMBlockchainIncludingTestnet),
                    transport: http(getPaymasterRPC(chain)),
                });
                return paymasterClient.sponsorUserOperation({
                    userOperation,
                });
            },
        }) as KernelAccountClient<Transport, Chain, KernelSmartAccount>;
        this.account = this.kernelClient.account;
    }

    getAddress() {
        try {
            return this.kernelClient.account.address;
        } catch (error) {
            logError("[GET_ADDRESS] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                signer: this.kernelClient.account,
            });
            throw new Error(`Error getting address. If this error persists, please contact support.`);
        }
    }

    async signMessage(message: string | Uint8Array) {
        try {
            let messageAsString: string;
            if (message instanceof Uint8Array) {
                const decoder = new TextDecoder();
                messageAsString = decoder.decode(message);
            } else {
                messageAsString = message;
            }
            return await this.kernelClient.signMessage({ message: messageAsString });
        } catch (error) {
            logError("[SIGN_MESSAGE] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                signer: this.kernelClient.account,
            });
            throw new Error(`Error signing message. If this error persists, please contact support.`);
        }
    }

    async signTypedData(params: TypedDataDefinition) {
        try {
            return await this.kernelClient.signTypedData(params);
        } catch (error) {
            logError("[SIGN_TYPED_DATA] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                signer: this.kernelClient.account,
            });
            throw new Error(`Error signing typed data. If this error persists, please contact support.`);
        }
    }

    async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<Hash> {
        try {
            const decoratedTransaction = await decorateSendTransactionData(transaction);

            return await this.kernelClient.sendTransaction({
                to: decoratedTransaction.to as `0x${string}`,
                value: decoratedTransaction.value ? BigInt(decoratedTransaction.value.toString()) : undefined,
                gas: decoratedTransaction.gasLimit ? BigInt(decoratedTransaction.gasLimit.toString()) : undefined,
                nonce: await getNonce(decoratedTransaction.nonce),
                data: await convertData(decoratedTransaction.data),
                maxFeePerGas: decoratedTransaction.maxFeePerGas
                    ? BigInt(decoratedTransaction.maxFeePerGas.toString())
                    : undefined,
                maxPriorityFeePerGas: decoratedTransaction.maxPriorityFeePerGas
                    ? BigInt(decoratedTransaction.maxPriorityFeePerGas.toString())
                    : undefined,
            });
        } catch (error) {
            logError("[SEND_TRANSACTION] - ERROR_SENDING_TRANSACTION", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                transaction,
            });
            throw new TransactionError(`Error sending transaction: ${error}`);
        }
    }

    /** TODO:  Not supported in ethers v5 
    async transfer(toAddress: string, token: Token, quantity?: number, amount?: BigNumber): Promise<string> {
        const evmToken = token as EVMToken;
        const contractAddress = evmToken.contractAddress;

        try {
            let transaction;
            const signer = await this.getSigner("ethers");
            
            const contract = new ethers.Contract(
                contractAddress,
                amount !== undefined ? erc20 : quantity !== undefined ? erc1155 : erc721,
                signer.provider
            );
            const contractWithSigner = contract.connect(signer);

            if (amount !== undefined) {
                // Transfer ERC20
                transaction = await contractWithSigner.functions.transfer(toAddress, amount);
            } else if (quantity !== undefined) {
                // Transfer ERC1155
                transaction = await contractWithSigner.functions.safeTransferFrom(
                    this.getAddress(),
                    toAddress,
                    evmToken.tokenId,
                    quantity,
                    "0x00"
                );
            } else {
                // Transfer ERC721
                transaction = await contractWithSigner.functions.transferFrom(
                    this.getAddress(),
                    toAddress,
                    evmToken.tokenId
                );
            }

            const receipt = await transaction!.wait();
            if (receipt.status === 1) {
                return transaction!.hash;
            } else {
                throw new TransferError(
                    `Error transferring token ${evmToken.tokenId}${
                        !transaction || !transaction.hash ? "" : ` with transaction hash ${transaction.hash}`
                    }`
                );
            }
        } catch (error) {
            logError("[TRANSFER] - ERROR_TRANSFERRING_TOKEN", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                tokenId: evmToken.tokenId,
                contractAddress: evmToken.contractAddress,
                chain: evmToken.chain,
            });
            throw new TransferError(`Error transferring token ${evmToken.tokenId}`);
        }
    }
*/
    async getSigner<Type extends SignerType>(type: Type): Promise<SignerMap[Type]> {
        switch (type) {
            case "viem": {
                const walletClient = createWalletClient({
                    account: this.account,
                    chain: getViemNetwork(this.chain as EVMBlockchainIncludingTestnet),
                    transport: http(getBundlerRPC(this.chain)),
                }).extend(publicActions) as any;
                return walletClient as SignerMap[Type];
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
        try {
            logInfo("[SET_CUSTODIAN_FOR_TOKENS] - INIT", {
                service: SCW_SERVICE,
                tokenType,
                custodian,
            });

            const rpcProvider = getUrlProviderByBlockchain(this.chain);
            const web3 = new Web3(rpcProvider as any);
            const walletClientSigner = createWalletClient({
                chain: getViemNetwork(this.chain as EVMBlockchainIncludingTestnet),
                account: this.sessionKeySignerAddress!,
                transport: custom(web3.provider as EIP1193Provider),
            });

            const smartAccountSigner = walletClientToSmartAccountSigner(walletClientSigner);
            const sessionKeyValidator = await signerToSessionKeyValidator(this.publicClient, {
                signer: smartAccountSigner,
                validatorData: {
                    paymaster: oneAddress,
                },
            });

            const sessionKeyAccount = await createKernelAccount(this.publicClient, {
                plugins: {
                    sudo: this.ecdsaValidator,
                    regular: sessionKeyValidator,
                },
            });
            const serializedSessionKeyAccount = await serializeSessionKeyAccount(sessionKeyAccount);
            const generateSessionKeyDataInput: GenerateSignatureDataInput = {
                sessionKeyData: serializedSessionKeyAccount,
                smartContractWalletAddress: this.account.address,
                chain: this.chain,
                version: 0,
            };

            await this.crossmintService.generateChainData(generateSessionKeyDataInput);
            logInfo("[SET_CUSTODIAN_FOR_TOKENS] - FINISH", {
                service: SCW_SERVICE,
                tokenType,
                custodian,
            });
        } catch (error) {
            logError("[SET_CUSTODIAN_FOR_TOKENS] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                tokenType,
                custodian,
            });
            throw new Error(`Error setting custodian for tokens. If this error persists, please contact support.`);
        }
    }

    async getNFTs() {
        return this.crossmintService.fetchNFTs(this.account.address);
    }
}
