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
import { resolveDeferrable } from "@/utils/deferrable";
import type { Deferrable } from "@ethersproject/properties";
import { type TransactionRequest } from "@ethersproject/providers";
import type { KernelValidator } from "@zerodev/ecdsa-validator";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk";
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { BigNumberish } from "ethers";
import { walletClientToSmartAccountSigner } from "permissionless";
import { createPimlicoPaymasterClient } from "permissionless/clients/pimlico";
import { EntryPoint } from "permissionless/types/entrypoint";
import type { Hash, HttpTransport, PublicClient, SignTypedDataParameters } from "viem";
import { Hex, createWalletClient, custom, http } from "viem";
import { Web3 } from "web3";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

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
import { TokenType } from "../token";

type GasFeeTransactionParams = {
    maxFeePerGas?: BigNumberish;
    maxPriorityFeePerGas?: BigNumberish;
};

export class EVMAAWallet<B extends EVMBlockchainIncludingTestnet = EVMBlockchainIncludingTestnet> {
    private sessionKeySignerAddress?: Hex;
    private crossmintService: CrossmintWalletService;
    private publicClient: PublicClient;
    private ecdsaValidator: KernelValidator<entryPoint, "ECDSAValidator">;
    // account represents the one got from eth_requestAccounts.
    // we need to expose it because createKernelAccountClient returns that it can be undefined, and some methods require it to be specifically included because of that.
    public account: KernelSmartAccount<EntryPoint, HttpTransport, TChain>;
    private kernelClient: ReturnType<
        typeof createKernelAccountClient<
            EntryPoint,
            HttpTransport,
            TChain,
            KernelSmartAccount<EntryPoint, HttpTransport, TChain>
        >
    >;
    private entryPoint: EntryPoint;
    chain: B;

    constructor(
        account: KernelSmartAccount<EntryPoint, HttpTransport, TChain>,
        crossmintService: CrossmintWalletService,
        chain: B,
        publicClient: PublicClient,
        ecdsaValidator: KernelValidator<entryPoint, "ECDSAValidator">,
        entryPoint: EntryPoint
    ) {
        this.chain = chain;
        this.crossmintService = crossmintService;
        this.publicClient = publicClient;
        this.ecdsaValidator = ecdsaValidator;

        this.kernelClient = createKernelAccountClient({
            account,
            chain: getViemNetwork(chain),
            entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(this.hasEIP1559Support() && {
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

    getPaymasterClient() {
        return this.chain === EVMBlockchainIncludingTestnet.BASE ||
            this.chain === EVMBlockchainIncludingTestnet.BASE_SEPOLIA
            ? createPimlicoPaymasterClient({
                  chain: getViemNetwork(this.chain),
                  transport: http(getPaymasterRPC(this.chain)),
                  entryPoint: this.entryPoint,
              })
            : createZeroDevPaymasterClient({
                  chain: getViemNetwork(this.chain),
                  transport: http(getPaymasterRPC(this.chain)),
                  entryPoint: this.entryPoint,
              });
    }

    getAddress() {
        return this.kernelClient.account?.address;
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

            return await this.kernelClient.signMessage({
                message: messageAsString,
            });
        } catch (error) {
            logError("[SIGN_MESSAGE] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                signer: this.kernelClient.account,
            });
            throw new Error(`Error signing message. If this error persists, please contact support.`);
        }
    }

    //TODO @matias: if createKernelAccountClient returns account as defined, then we can change the parameter type to TypedDataDefinition
    async signTypedData(params: SignTypedDataParameters) {
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

    //TODO @matias: review this method.
    // First, I would like to use TransactionRequest from viem instead of ethers.
    // Second, we need to check if chain supports eip-1559 ro not:
    // - If it does, we need to send maxFeePerGas and maxPriorityFeePerGas
    // - If it doesn't, we need to send gasPrice
    // And with the use of viem TransactionRequest, we can specify the TransactionRequest type (eip1559 or legacy) and be more accurate
    async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<Hash> {
        try {
            const decoratedTransaction = await decorateSendTransactionData(transaction);
            const { to, value, gasLimit, nonce, data, maxFeePerGas, maxPriorityFeePerGas } = await resolveDeferrable(
                decoratedTransaction
            );

            return await this.kernelClient.sendTransaction({
                to: to as `0x${string}`,
                value: value ? BigInt(value.toString()) : undefined,
                gas: gasLimit ? BigInt(gasLimit.toString()) : undefined,
                nonce: await getNonce(nonce),
                data: await convertData(data),
                ...this.getLegacyTransactionFeesParamsIfApply({ maxFeePerGas, maxPriorityFeePerGas }),
                maxFeePerBlobGas: undefined,
                blobs: undefined,
                blobVersionedHashes: undefined,
                kzg: undefined,
                sidecars: undefined,
                type: undefined,
                chain: null,
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
                smartContractWalletAddress: this.kernelClient.account?.address,
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

            const enableSig = await this.kernelClient.account?.kernelPluginManager.getPluginEnableSignature(
                this.kernelClient.account?.address
            );

            await this.crossmintService.updateWallet(this.kernelClient.account?.address, enableSig, 1);
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

    hasEIP1559Support() {
        const chainsNotSupportingEIP1559: EVMBlockchainIncludingTestnet[] = [
            EVMBlockchainIncludingTestnet.ZKYOTO,
            EVMBlockchainIncludingTestnet.ASTAR_ZKEVM,
        ];
        return !chainsNotSupportingEIP1559.includes(this.chain);
    }

    getLegacyTransactionFeesParamsIfApply(gasFeeParams?: GasFeeTransactionParams) {
        const { maxFeePerGas, maxPriorityFeePerGas } = gasFeeParams ?? {};

        if (this.hasEIP1559Support()) {
            return {
                maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas.toString()) : undefined,
                maxPriorityFeePerGas: maxPriorityFeePerGas ? BigInt(maxPriorityFeePerGas.toString()) : undefined,
            };
        } else {
            if (maxFeePerGas || maxPriorityFeePerGas) {
                console.warn(
                    "maxFeePerGas and maxPriorityFeePerGas are not supported on this chain as it supports Legacy Transacitons. Ignoring them."
                );
            }
            return {
                // It's on zerodev doc that we need to ignore ts errros on maxFeePerGas and maxPriorityFeePerGas
                // https://docs.zerodev.app/sdk/faqs/use-with-gelato#transaction-configuration
                maxFeePerGas: "0x0" as any,
                maxPriorityFeePerGas: "0x0" as any,
            };
        }
    }
}
