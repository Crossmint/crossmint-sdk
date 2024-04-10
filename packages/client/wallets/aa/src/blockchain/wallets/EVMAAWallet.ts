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
import type { KernelAccountClient, KernelValidator } from "@zerodev/sdk";
import {
    KernelSmartAccount,
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { oneAddress, serializeSessionKeyAccount, signerToSessionKeyValidator } from "@zerodev/session-key";
import { UserOperation, walletClientToSmartAccountSigner } from "permissionless";
import type { Chain, EIP1193Provider, Hash, PublicClient, Transport, TypedDataDefinition } from "viem";
import { Hex, createWalletClient, custom, http } from "viem";
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
    private kernelClient: KernelAccountClient<Transport, Chain, KernelSmartAccount>;
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
        this.account = account;
    }

    getAddress() {
        return this.kernelClient.account.address;
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

    /* Pending new version of transfer
    async transfer(toAddress: string, token: Token, quantity?: number, amount?: BigNumber): Promise<string> {
        const evmToken = token as EVMToken;
        const contractAddress = evmToken.contractAddress as `0x${string}`;
        const publicClient = this.kernelClient.extend(publicActions);
        let transaction;
        try {
            if (amount !== undefined) {
                // Transfer ERC20
                const { request } = await publicClient.simulateContract({
                    account: this.account,
                    address: contractAddress,
                    abi: erc20,
                    functionName: "transfer",
                    args: [toAddress, amount],
                });
                transaction = await publicClient.writeContract(request);
            } else if (quantity !== undefined) {
                // Transfer ERC1155
                const { request } = await publicClient.simulateContract({
                    account: this.account,
                    address: contractAddress,
                    abi: erc1155,
                    functionName: "safeTransferFrom",
                    args: [this.getAddress(), toAddress, evmToken.tokenId, quantity, "0x00"],
                });
                transaction = await publicClient.writeContract(request);
            } else {
                // Transfer ERC721
                const { request } = await publicClient.simulateContract({
                    account: this.account,
                    address: contractAddress,
                    abi: erc721,
                    functionName: "safeTransferFrom",
                    args: [this.getAddress(), toAddress, evmToken.tokenId],
                });
                transaction = await publicClient.writeContract(request);
            }

            if (transaction != null) {
                return transaction;
            } else {
                throw new TransferError(
                    `Error transferring token ${evmToken.tokenId}${
                        !transaction ? "" : ` with transaction hash ${transaction}`
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
    } */

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

            sessionKeyAccount;
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

    async upgradeVersion() {
        try {
            logInfo("[UPGRADE_VERSION] - INIT", { service: SCW_SERVICE });
            const sessionKeys = await this.crossmintService!.createSessionKey(this.kernelClient.account.address);
            if (sessionKeys == null) {
                throw new Error("Abstract Wallet doesn't have a session key signer address");
            }

            const latestVersion = await this.crossmintService.checkVersion(this.kernelClient.account.address);
            if (latestVersion.isUpToDate) {
                return;
            }

            const versionInfo = latestVersion.latestVersion;
            if (versionInfo == null) {
                throw new Error("New version info not found");
            }

            const enableSig = await this.kernelClient.account.kernelPluginManager.getPluginEnableSignature(
                this.kernelClient.account.address
            );

            await this.crossmintService.updateWallet(this.kernelClient.account.address, enableSig, 1);
            logInfo("[UPGRADE_VERSION - FINISH", { service: SCW_SERVICE });
        } catch (error) {
            logError("[UPGRADE_VERSION] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
            });
            throw new Error(`Error upgrading version. If this error persists, please contact support.`);
        }
    }

    async getNFTs() {
        return this.crossmintService.fetchNFTs(this.account.address, this.chain);
    }
}
