import type { Address } from "viem";
import nacl from "tweetnacl";
import { WebAuthnP256 } from "ox";
import { Keypair, type VersionedTransaction } from "@solana/web3.js";

import type { ApiClient, CreateWalletResponse, GetWalletSuccessResponse } from "../api";
import {
    InvalidWalletConfigError,
    WalletCreationError,
    WalletNotAvailableError,
    WalletTypeMismatchError,
    WalletTypeNotSupportedError,
} from "../utils/errors";
import { EVMWallet, SolanaWallet } from "../wallet";
import { EVMApprovalService } from "../services/approvals/evm-approval-service";
import { SolanaApprovalService } from "../services/approvals/solana-approval-service";
import { createCrossmint } from "@crossmint/common-sdk-base";
import type { Wallet } from "../wallet";
import type { ApprovalServiceConfig } from "./approvals/types";
import type { Chain, EVMChain, EVMSigner, GetOrCreateWalletOptions, Owner, SolanaSigner, WalletType } from "@/types";

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<C extends Chain>(args: GetOrCreateWalletOptions<C>) {
        try {
            const walletType = args.chain === "solana" ? "solana-smart-wallet" : ("evm-smart-wallet" as const);
            const walletResponse = await this.getOrCreateWalletInternal(args);
            if ("error" in walletResponse) {
                throw new WalletCreationError(JSON.stringify(walletResponse));
            }
            const wallet = this.createWalletInstance(walletType, walletResponse, args);
            await args.options?.experimental_callbacks?.onWalletCreationComplete?.(wallet);
            return wallet;
        } catch (e: unknown) {
            await args.options?.experimental_callbacks?.onWalletCreationFail?.(e as Error);
            throw e;
        }
    }

    public async getWallet<C extends Chain>(address: string, args: GetOrCreateWalletOptions<C>) {
        const walletType = args.chain === "solana" ? "solana-smart-wallet" : "evm-smart-wallet";
        const locator = this.apiClient.isServerSide ? address : `me:${walletType}`;
        const walletResponse = await this.apiClient.getWallet(locator);

        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        return this.createWalletInstance(walletType, walletResponse, args);
    }

    private async getOrCreateWalletInternal<C extends Chain>(args: GetOrCreateWalletOptions<C>) {
        const walletType = args.chain === "solana" ? "solana-smart-wallet" : ("evm-smart-wallet" as const);
        const existingWallet = this.apiClient.isServerSide ? null : await this.apiClient.getWallet(`me:${walletType}`);
        if (existingWallet && !("error" in existingWallet)) {
            return existingWallet;
        }
        await args.options?.experimental_callbacks?.onWalletCreationStart?.();

        if (walletType === "evm-smart-wallet") {
            const { signer: adminSignerInput } = args;
            const adminSigner = adminSignerInput as EVMSigner;
            if (adminSigner.type === "external-wallet") {
                return await this.apiClient.createWallet({
                    type: "evm-smart-wallet",
                    config: {
                        adminSigner: {
                            type: "evm-keypair",
                            address: adminSigner.address,
                        },
                    },
                });
            } else {
                const passkeySigner = await this.createPasskeySigner(adminSigner.name ?? "");
                return await this.apiClient.createWallet({
                    type: "evm-smart-wallet",
                    config: {
                        adminSigner: passkeySigner,
                    },
                });
            }
        } else if (walletType === "solana-smart-wallet") {
            const adminSigner = this.parseSolanaSigner(args.signer as SolanaSigner);
            return await this.apiClient.createWallet({
                type: "solana-smart-wallet",
                config: {
                    adminSigner: {
                        type: "solana-keypair",
                        address: adminSigner.address,
                    },
                },
            });
        } else {
            throw new WalletTypeNotSupportedError(`Wallet type ${walletType} not supported`);
        }
    }

    private async createPasskeySigner(
        name?: string,
        creationCallback?: (name: string) => Promise<{ id: string; publicKey: { x: string; y: string } }>
    ) {
        const passkeyName = name ?? `Crossmint Wallet ${Date.now()}`;
        const passkeyCredential = creationCallback
            ? await creationCallback(passkeyName)
            : await WebAuthnP256.createCredential({
                  name: passkeyName,
              });
        return {
            type: "evm-passkey",
            id: passkeyCredential.id,
            name: passkeyName,
            publicKey: {
                x: passkeyCredential.publicKey.x.toString(),
                y: passkeyCredential.publicKey.y.toString(),
            },
        } as const;
    }

    private createWalletInstance(
        type: WalletType,
        walletResponse: GetWalletSuccessResponse,
        args: GetOrCreateWalletOptions<Chain>
    ): Wallet<Chain> {
        this.assertCorrectWalletType(walletResponse, type);
        // this.checkWalletConfig(walletResponse, args);

        const crossmint = createCrossmint({
            apiKey: this.apiClient.crossmint.apiKey,
            jwt: this.apiClient.crossmint.jwt,
            overrideBaseUrl: this.apiClient.crossmint.overrideBaseUrl,
            appId: this.apiClient.crossmint.appId,
        });

        const approvalServiceConfig: ApprovalServiceConfig = {
            walletLocator: walletResponse.address,
            apiClient: this.apiClient,
        };

        switch (type) {
            case "evm-smart-wallet": {
                const evmResponse = walletResponse as Extract<GetWalletSuccessResponse, { type: "evm-smart-wallet" }>;
                const wallet = new EVMWallet(crossmint, {
                    chain: args.chain as EVMChain,
                    address: evmResponse.address as Address,
                    owner: evmResponse.linkedUser as Owner,
                    adminSigner: args.signer as EVMSigner,
                    approvalService: new EVMApprovalService(approvalServiceConfig, args.signer as EVMSigner),
                });
                return wallet as Wallet<Chain>;
            }
            case "solana-smart-wallet": {
                const solanaResponse = walletResponse as Extract<
                    GetWalletSuccessResponse,
                    { type: "solana-smart-wallet" }
                >;
                const wallet = new SolanaWallet(crossmint, {
                    chain: "solana",
                    address: solanaResponse.address,
                    owner: solanaResponse.linkedUser as Owner,
                    adminSigner: this.parseSolanaSigner(args.signer as SolanaSigner) as SolanaSigner,
                    approvalService: new SolanaApprovalService(approvalServiceConfig, args.signer as SolanaSigner),
                });
                return wallet as Wallet<Chain>;
            }
            default:
                throw new WalletTypeNotSupportedError(`Wallet type ${type} not supported`);
        }
    }

    // private checkWalletConfig(existingWallet: GetWalletSuccessResponse, args: GetOrCreateWalletOptions<Chain>) {
    //     switch (existingWallet.type) {
    //         case "evm-smart-wallet":
    //         case "solana-smart-wallet": {
    //             const { signer: adminSignerInput } = args;
    //             if (adminSignerInput === undefined) {
    //                 return;
    //             }
    //             const walletAdminSigner = existingWallet.config.adminSigner;
    //             if (walletAdminSigner.type !== adminSignerInput.type) {
    //                 throw new InvalidWalletConfigError(
    //                     `Invalid admin signer type: expected "${adminSignerInput.type}", got "${walletAdminSigner.type}"`
    //                 );
    //             }
    //             switch (walletAdminSigner.type) {
    //                 case "evm-keypair":
    //                 case "solana-keypair": {
    //                     if (adminSignerInput.type !== "evm-keypair" && adminSignerInput.type !== "solana-keypair") {
    //                         throw new InvalidWalletConfigError(
    //                             `Invalid admin signer type: expected "${adminSignerInput.type}", got "${walletAdminSigner.type}"`
    //                         );
    //                     }
    //                     if (walletAdminSigner.address !== adminSignerInput.address) {
    //                         throw new InvalidWalletConfigError(
    //                             `Invalid admin signer address: expected "${walletAdminSigner.address}", got "${adminSignerInput.address}"`
    //                         );
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }

    private parseSolanaSigner(signer: SolanaSigner) {
        if (signer.type !== "external-wallet") {
            throw new InvalidWalletConfigError("Only external wallets are supported for Solana");
        }
        // Use Solana's built in Keypair if it's a Keypair
        if (signer instanceof Keypair) {
            return {
                type: "solana-keypair",
                address: signer.publicKey.toBase58(),
                // biome-ignore lint/suspicious/useAwait: <explanation>
                onSignTransaction: async (transaction: VersionedTransaction) => {
                    transaction.sign([signer]);
                    return transaction;
                },
                // biome-ignore lint/suspicious/useAwait: <explanation>
                signMessage: async (message: Uint8Array) => {
                    const signature = nacl.sign.detached(message, signer.secretKey);
                    return new Uint8Array(signature);
                },
            };
        }
        return {
            type: "solana-keypair",
            address: signer.address,
            onSignTransaction: signer.onSignTransaction as (
                transaction: VersionedTransaction
            ) => Promise<VersionedTransaction>,
            onSignMessage: signer.onSignMessage as (message: Uint8Array) => Promise<Uint8Array>,
        };
    }

    private assertCorrectWalletType(
        walletResponse: CreateWalletResponse,
        type: WalletType
    ): asserts walletResponse is Extract<CreateWalletResponse, { type: WalletType }> {
        if ("error" in walletResponse) {
            throw new WalletCreationError(`Unable to init wallet: ${JSON.stringify(walletResponse)}`);
        }
        if (walletResponse.type !== type) {
            throw new WalletTypeMismatchError("Invalid wallet type");
        }
    }
}
