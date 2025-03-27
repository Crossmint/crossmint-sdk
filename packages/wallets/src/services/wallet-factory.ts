import { PublicKey } from "@solana/web3.js";
import type { Address } from "viem";

import { SolanaMPCWallet } from "../solana";
import type { EvmWalletType, SolanaWalletType, WalletTypeToArgs, WalletTypeToWallet } from "./types";
import type { ApiClient, CreateWalletResponse, GetWalletSuccessResponse } from "../api";
import { EVMSmartWallet } from "../evm";
import { createPasskeySigner, getEvmAdminSigner } from "../evm/utils";
import { SolanaSmartWallet } from "../solana";
import { parseSolanaSignerInput } from "../solana/types/signers";
import { getConnectionFromEnvironment } from "../solana/utils";
import type { WalletOptions } from "../utils/options";
import {
    InvalidWalletConfigError,
    WalletCreationError,
    WalletNotAvailableError,
    WalletTypeMismatchError,
    WalletTypeNotSupportedError,
} from "../utils/errors";

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        args: WalletTypeToArgs[WalletType],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[WalletType]> {
        try {
            const walletResponse = await this.getOrCreateWalletInternal(type, args, options);
            if ("error" in walletResponse) {
                throw new WalletCreationError(JSON.stringify(walletResponse));
            }
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
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        return this.createWalletInstance(type, walletResponse, args, options);
    }

    private async getOrCreateWalletInternal<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        args: WalletTypeToArgs[WalletType],
        options?: WalletOptions
    ): Promise<CreateWalletResponse> {
        const existingWallet = this.apiClient.isServerSide ? null : await this.apiClient.getWallet(`me:${type}`);
        if (existingWallet && "error" in existingWallet) {
            throw new WalletNotAvailableError(JSON.stringify(existingWallet));
        }
        if (existingWallet) {
            return existingWallet;
        }
        await options?.experimental_callbacks?.onWalletCreationStart?.();
        if (type === "evm-smart-wallet") {
            const { adminSigner: adminSignerInput, linkedUser } = args as WalletTypeToArgs["evm-smart-wallet"];
            const adminSigner =
                adminSignerInput.type === "evm-keypair"
                    ? adminSignerInput
                    : await createPasskeySigner(adminSignerInput.name, adminSignerInput.creationCallback);
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
            throw new WalletTypeNotSupportedError(`Wallet type ${type} not supported`);
        }
    }

    private createWalletInstance<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        walletResponse: GetWalletSuccessResponse,
        args: WalletTypeToArgs[WalletType],
        options?: WalletOptions
    ): WalletTypeToWallet[WalletType] {
        this.assertCorrectWalletType(walletResponse, type);
        this.checkWalletConfig(walletResponse, args);
        switch (type) {
            case "evm-smart-wallet":
                const evmArgs = args as WalletTypeToArgs[EvmWalletType];
                const evmWallet = this.createEvmWalletInstance(type, walletResponse, evmArgs, options);
                return evmWallet as WalletTypeToWallet[WalletType];
            case "solana-smart-wallet":
            case "solana-mpc-wallet":
                const solanaArgs = args as WalletTypeToArgs[SolanaWalletType];
                const solanaWallet = this.createSolanaWalletInstance(type, walletResponse, solanaArgs, options);
                return solanaWallet as WalletTypeToWallet[WalletType];
            default:
                throw new WalletTypeNotSupportedError(`Wallet type ${type} not supported`);
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
                    getEvmAdminSigner(adminSignerInput, evmResponse),
                    options?.experimental_callbacks ?? {}
                ) as WalletTypeToWallet[WalletType];
            }
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

    /**
     * Checks if the wallet config passed during wallet initialization matches the API response
     * Throws on mismatch
     * @param existingWallet Onchain wallet state
     * @param args Wallet config passed during wallet initialization
     */
    private checkWalletConfig<WalletType extends keyof WalletTypeToArgs>(
        existingWallet: GetWalletSuccessResponse,
        args: WalletTypeToArgs[WalletType]
    ) {
        switch (existingWallet.type) {
            case "evm-smart-wallet":
            case "solana-smart-wallet": {
                const { adminSigner: adminSignerInput } = args as WalletTypeToArgs[
                    | "evm-smart-wallet"
                    | "solana-smart-wallet"];
                if (adminSignerInput === undefined) {
                    return;
                }
                const walletAdminSigner = existingWallet.config.adminSigner;
                if (walletAdminSigner.type !== adminSignerInput.type) {
                    throw new InvalidWalletConfigError(
                        `Invalid admin signer type: expected "${adminSignerInput.type}", got "${walletAdminSigner.type}"`
                    );
                }
                switch (walletAdminSigner.type) {
                    case "evm-keypair":
                    case "solana-keypair": {
                        if (adminSignerInput.type !== "evm-keypair" && adminSignerInput.type !== "solana-keypair") {
                            throw new InvalidWalletConfigError(
                                `Invalid admin signer type: expected "${adminSignerInput.type}", got "${walletAdminSigner.type}"`
                            );
                        }
                        if (walletAdminSigner.address !== adminSignerInput.address) {
                            throw new InvalidWalletConfigError(
                                `Invalid admin signer address: expected "${walletAdminSigner.address}", got "${adminSignerInput.address}"`
                            );
                        }
                    }
                }
            }
        }
    }

    private assertCorrectWalletType<WalletType extends keyof WalletTypeToArgs>(
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
