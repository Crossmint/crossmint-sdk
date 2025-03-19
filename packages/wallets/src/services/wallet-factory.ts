import { PublicKey } from "@solana/web3.js";
import type { Address } from "viem";

import { SolanaMPCWallet } from "../solana";
import type { EvmWalletType, SolanaWalletType, WalletTypeToArgs, WalletTypeToWallet } from "./types";
import type { ApiClient, CreateWalletResponse } from "../api";
import { EVMSmartWallet } from "../evm";
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
        const walletResponse = await this.apiClient.getWallet(address);
        return this.createWalletInstance(type, walletResponse, args, options);
    }

    private async createWallet<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        args: WalletTypeToArgs[WalletType]
    ): Promise<CreateWalletResponse> {
        if (type === "evm-smart-wallet") {
            const { adminSigner, linkedUser } = args as WalletTypeToArgs["evm-smart-wallet"];
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
                const { chain, adminSigner } = args as WalletTypeToArgs["evm-smart-wallet"];
                const evmResponse = walletResponse as Extract<CreateWalletResponse, { type: "evm-smart-wallet" }>;
                const adminSignerLocator = evmResponse.config.adminSigner.locator;
                return new EVMSmartWallet(
                    chain,
                    this.apiClient,
                    evmResponse.address as Address,
                    {
                        ...adminSigner,
                        locator: adminSignerLocator,
                    },
                    options?.experimental_callbacks ?? {}
                ) as WalletTypeToWallet[WalletType];
            }
            case "evm-mpc-wallet":
                throw new Error("Not implemented");
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
