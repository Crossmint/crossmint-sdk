import { CrossmintService } from "@/api";
import { logError, logInfo } from "@/services/logging";
import { GenerateSignatureDataInput } from "@/types";
import { errorToJSON } from "@/utils";
import type { Deferrable } from "@ethersproject/properties";
import { type TransactionRequest, type TransactionResponse } from "@ethersproject/providers";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { KernelAccountClient, createKernelAccount } from "@zerodev/sdk";
import { signerToSessionKeyValidator } from "@zerodev/session-key";
import { BigNumber } from "ethers";
import { SmartAccountSigner } from "permissionless/accounts/types";
import { SignableMessage, TypedDataDefinition, createPublicClient } from "viem";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { Custodian } from "../plugins";
import { Token, TokenType } from "../token/Tokens";

export class EVMAAWallet {
    private sessionKeySignerAddress?: string;
    private kernelClient: KernelAccountClient;
    private smartAccountSigner: SmartAccountSigner;
    crossmintService: CrossmintService;
    chain: BlockchainIncludingTestnet;

    constructor(
        kernelClient: KernelAccountClient,
        chain: BlockchainIncludingTestnet,
        crossmintService: CrossmintService,
        smartAccountSigner: SmartAccountSigner
    ) {
        this.chain = chain;
        this.kernelClient = kernelClient;
        this.crossmintService = crossmintService;
        this.smartAccountSigner = smartAccountSigner;
    }

    async getAddress(): Promise<string> {
        return this.kernelClient.account!.address;
    }

    async signMessage(message: SignableMessage): Promise<string> {
        try {
            return await this.kernelClient.account!.signMessage({
                message: message as SignableMessage,
            });
        } catch (error) {
            logError("[SIGN_MESSAGE] - ERROR", {
                error: errorToJSON(error),
                signer: this.smartAccountSigner,
            });
            throw new Error(`Error signing message. If this error persists, please contact support.`);
        }
    }

    async signTypedData(params: TypedDataDefinition): Promise<string> {
        try {
            return (await this.kernelClient.account!.signTypedData(params)) as string;
        } catch (error) {
            logError("[SIGN_TYPED_DATA] - ERROR", {
                error: errorToJSON(error),
                signer: this.smartAccountSigner,
            });
            throw new Error(`Error signing typed data. If this error persists, please contact support.`);
        }
    }

    async transfer(toAddress: string, token: Token, quantity?: number, amount?: BigNumber): Promise<string> {
        throw new Error(`Error method not implemented yet.`);
    }

    async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<TransactionResponse> {
        throw new Error(`Error method not implemented yet.`);
    }

    setSessionKeySignerAddress(sessionKeySignerAddress: string) {
        this.sessionKeySignerAddress = sessionKeySignerAddress;
    }

    async getNFTs() {
        return this.crossmintService.fetchNFTs(await this.getAddress());
    }

    async setCustodianForTokens(tokenType?: TokenType, custodian?: Custodian) {
        try {
            logInfo("[SET_CUSTODIAN_FOR_TOKENS] - INIT", {
                tokenType,
                custodian,
            });

            const publicClient = createPublicClient({
                transport: this.kernelClient.account!.client!.transport["config"],
            });

            const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
                signer: this.kernelClient.account!,
            });

            const masterAccount = await createKernelAccount(publicClient, {
                plugins: {
                    validator: ecdsaValidator,
                },
            });
            console.log("Account address:", masterAccount.address);
            const sessionKeyValidator = await signerToSessionKeyValidator(publicClient, {
                signer: this.kernelClient.account!,
                /*validatorData: {
                  // Set session key params
                },*/
            });
            const sessionKeyAccount = await createKernelAccount(publicClient, {
                plugins: {
                    defaultValidator: ecdsaValidator,
                    validator: sessionKeyValidator,
                },
            });

            const enableSig = await sessionKeyAccount.kernelPluginManager.getPluginEnableSignature(
                this.kernelClient.account!.address
            );

            const generateSessionKeyDataInput: GenerateSignatureDataInput = {
                sessionKeyData: enableSig,
                smartContractWalletAddress: await this.getAddress(),
                chain: this.chain,
                version: 0,
            };

            await this.crossmintService.generateChainData(generateSessionKeyDataInput);
            logInfo("[SET_CUSTODIAN_FOR_TOKENS] - FINISH", {
                tokenType,
                custodian,
            });
        } catch (error) {
            logError("[SET_CUSTODIAN_FOR_TOKENS] - ERROR", {
                error: errorToJSON(error),
                tokenType,
                custodian,
            });
            throw new Error(`Error setting custodian for tokens. If this error persists, please contact support.`);
        }
    }
}
