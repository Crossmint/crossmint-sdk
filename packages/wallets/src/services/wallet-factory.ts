import { PublicKey } from "@solana/web3.js";
import type { Address } from "viem";
import { WebAuthnP256 } from "ox";

import { SolanaMPCWallet } from "../solana";
import type { EvmWalletType, SolanaWalletType, WalletTypeToArgs, WalletTypeToWallet } from "./types";
import type { ApiClient, CreateWalletResponse } from "../api";
import { type EVMSigner, type EVMSignerInput, EVMSmartWallet } from "../evm";
import { SolanaSmartWallet } from "../solana";
import { parseSolanaSignerInput } from "../solana/types/signers";
import { getConnectionFromEnvironment } from "../solana/utils";
import type { WalletOptions } from "../utils/options";

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        args: WalletTypeToArgs[WalletType],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[WalletType]> {
        try {
            await options?.experimental_callbacks?.onWalletCreationStart?.();
            const walletResponse = await this.createWallet(type, args);
            const wallet = this.createWalletInstance(type, walletResponse, args, options);
            await options?.experimental_callbacks?.onWalletCreationComplete?.(wallet);
            return wallet;
        } catch (e: unknown) {
            await options?.experimental_callbacks?.onWalletCreationFail?.(e as Error);
            throw e;
        }
    }

    public async getWallet<WalletType extends keyof WalletTypeToArgs>(
        address: string,
        type: WalletType,
        args: WalletTypeToArgs[WalletType],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[WalletType]> {
        const locator = this.apiClient.isServerSide ? address : `me:${type}`;
        const walletResponse = await this.apiClient.getWallet(locator);
        return this.createWalletInstance(type, walletResponse, args, options);
    }

    private async createWallet<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        args: WalletTypeToArgs[WalletType]
    ): Promise<CreateWalletResponse> {
        if (type === "evm-smart-wallet") {
            const { adminSigner: adminSignerInput, linkedUser } = args as WalletTypeToArgs["evm-smart-wallet"];
            const existingWallet = this.apiClient.isServerSide ? null : await this.apiClient.getWallet(`me:${type}`);
            // @ts-ignore
            if (existingWallet && !existingWallet.error) {
                return existingWallet;
            }
            const adminSigner =
                adminSignerInput.type === "evm-keypair"
                    ? adminSignerInput
                    : await this.createPasskeySigner(adminSignerInput.name);
            return await this.apiClient.createWallet({
                type: "evm-smart-wallet",
                config: {
                    adminSigner,
                },
                linkedUser,
            });
        } else if (type === "solana-smart-wallet") {
            const { adminSigner: adminSignerInput, linkedUser } = args as WalletTypeToArgs["solana-smart-wallet"];
            return await this.apiClient.createWallet({
                type: "solana-smart-wallet",
                config: {
                    adminSigner:
                        adminSignerInput != null
                            ? (() => {
                                  const parsedSigner = parseSolanaSignerInput(adminSignerInput);
                                  if (parsedSigner.type === "solana-keypair") {
                                      return {
                                          type: parsedSigner.type,
                                          address: parsedSigner.address,
                                      };
                                  }
                                  return {
                                      type: parsedSigner.type,
                                  };
                              })()
                            : undefined,
                },
                linkedUser,
            });
        } else if (type === "solana-mpc-wallet") {
            const { linkedUser } = args as WalletTypeToArgs["solana-mpc-wallet"];
            return await this.apiClient.createWallet({
                type: "solana-mpc-wallet",
                linkedUser,
            });
        } else {
            throw new Error("Not implemented");
        }
    }

    private async createPasskeySigner(name?: string) {
        const passkeyName = name ?? `Crossmint Wallet ${Date.now()}`;
        const passkeyCredential = await WebAuthnP256.createCredential({
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

    private createWalletInstance<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        walletResponse: CreateWalletResponse,
        args: WalletTypeToArgs[WalletType],
        options?: WalletOptions
    ): WalletTypeToWallet[WalletType] {
        this.assertCorrectWalletType(walletResponse, type);
        switch (type) {
            case "evm-smart-wallet":
            case "evm-mpc-wallet":
                const evmArgs = args as WalletTypeToArgs[EvmWalletType];
                const evmWallet = this.createEvmWalletInstance(type, walletResponse, evmArgs, options);
                return evmWallet as WalletTypeToWallet[WalletType];
            case "solana-smart-wallet":
            case "solana-mpc-wallet":
                const solanaArgs = args as WalletTypeToArgs[SolanaWalletType];
                const solanaWallet = this.createSolanaWalletInstance(type, walletResponse, solanaArgs, options);
                return solanaWallet as WalletTypeToWallet[WalletType];
            default:
                throw new Error(`Unhandled wallet type: ${type}`);
        }
    }

    private createEvmWalletInstance<WalletType extends EvmWalletType>(
        type: WalletType,
        walletResponse: CreateWalletResponse,
        args: WalletTypeToArgs[WalletType],
        options?: WalletOptions
    ) {
        switch (type) {
            case "evm-smart-wallet": {
                const { chain, adminSigner: adminSignerInput } = args as WalletTypeToArgs["evm-smart-wallet"];
                const evmResponse = walletResponse as Extract<CreateWalletResponse, { type: "evm-smart-wallet" }>;
                return new EVMSmartWallet(
                    chain,
                    this.apiClient,
                    evmResponse.address as Address,
                    this.getEvmAdminSigner(adminSignerInput, evmResponse),
                    options?.experimental_callbacks ?? {}
                ) as WalletTypeToWallet[WalletType];
            }
            case "evm-mpc-wallet":
                throw new Error("Not implemented");
        }
    }

    private getEvmAdminSigner(
        input: EVMSignerInput,
        response: Extract<CreateWalletResponse, { type: "evm-smart-wallet" }>
    ): EVMSigner {
        const responseSigner = response.config.adminSigner;
        switch (input.type) {
            case "evm-keypair":
                if (responseSigner.type !== "evm-keypair") {
                    throw new Error("Admin signer type mismatch");
                }
                return {
                    ...input,
                    locator: responseSigner.locator,
                };
            case "evm-passkey":
                if (responseSigner.type !== "evm-passkey") {
                    throw new Error("Admin signer type mismatch");
                }
                return {
                    type: "evm-passkey",
                    id: responseSigner.id,
                    name: input.name,
                    locator: responseSigner.locator,
                };
        }
    }

    private createSolanaWalletInstance<WalletType extends SolanaWalletType>(
        type: SolanaWalletType,
        walletResponse: CreateWalletResponse,
        args: WalletTypeToArgs[WalletType],
        options?: WalletOptions
    ) {
        const solanaResponse = walletResponse as Extract<CreateWalletResponse, { type: SolanaWalletType }>;
        switch (type) {
            case "solana-smart-wallet": {
                const { adminSigner: adminSignerInput } = args as WalletTypeToArgs["solana-smart-wallet"];
                return new SolanaSmartWallet(
                    this.apiClient,
                    new PublicKey(solanaResponse.address),
                    adminSignerInput ?? {
                        type: "solana-fireblocks-custodial",
                    },
                    getConnectionFromEnvironment(this.apiClient.environment),
                    options?.experimental_callbacks ?? {}
                ) as WalletTypeToWallet[WalletType];
            }
            case "solana-mpc-wallet": {
                return new SolanaMPCWallet(
                    this.apiClient,
                    new PublicKey(solanaResponse.address),
                    getConnectionFromEnvironment(this.apiClient.environment),
                    options?.experimental_callbacks ?? {}
                ) as WalletTypeToWallet[WalletType];
            }
        }
    }

    private assertCorrectWalletType<WalletType extends keyof WalletTypeToArgs>(
        walletResponse: CreateWalletResponse,
        type: WalletType
    ): asserts walletResponse is Extract<CreateWalletResponse, { type: WalletType }> {
        if (walletResponse.type !== type) {
            throw new Error("Invalid wallet type");
        }
    }
}
