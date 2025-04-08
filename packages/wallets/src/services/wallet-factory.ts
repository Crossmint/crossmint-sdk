import { PublicKey } from "@solana/web3.js";
import type { Address } from "viem";

import type { EvmWalletType, SolanaWalletType, WalletTypeToArgs, WalletTypeToWallet } from "./types";
import type { ApiClient, CreateWalletResponse, GetWalletSuccessResponse } from "../api";
import { createPasskeySigner, getEvmAdminSigner } from "../evm/utils";
import { ISolanaMPCWallet, ISolanaSmartWallet, type SolanaMPCWallet, type SolanaSmartWallet } from "../solana";
import { IEVMSmartWallet, type EVMSmartWallet } from "../evm";
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
        if (existingWallet && !("error" in existingWallet)) {
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
                const wallet = new IEVMSmartWallet(
                    chain,
                    this.apiClient,
                    evmResponse.address as Address,
                    getEvmAdminSigner(adminSignerInput, evmResponse),
                    options?.experimental_callbacks ?? {}
                );
                return {
                    getBalances: wallet.getBalances.bind(wallet),
                    getTransactions: wallet.getTransactions.bind(wallet),
                    getNfts: wallet.getNfts.bind(wallet),
                    getAddress: wallet.getAddress.bind(wallet),
                    getNonce: wallet.getNonce.bind(wallet),
                    signMessage: wallet.signMessage.bind(wallet),
                    signTypedData: wallet.signTypedData.bind(wallet),
                    sendTransaction: wallet.sendTransaction.bind(wallet),
                    chain: wallet.chain,
                    publicClient: wallet.publicClient,
                } as EVMSmartWallet;
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
                const wallet = new ISolanaSmartWallet(
                    this.apiClient,
                    new PublicKey(solanaResponse.address),
                    adminSignerInput ?? {
                        type: "solana-fireblocks-custodial",
                    },
                    getConnectionFromEnvironment(this.apiClient.environment),
                    options?.experimental_callbacks ?? {}
                );
                return {
                    getDelegatedSigners: wallet.getDelegatedSigners.bind(wallet),
                    addDelegatedSigner: wallet.addDelegatedSigner.bind(wallet),
                    adminSigner: wallet.adminSigner,
                    getBalances: wallet.getBalances.bind(wallet),
                    getAddress: wallet.getAddress.bind(wallet),
                    getPublicKey: wallet.getPublicKey.bind(wallet),
                    getNfts: wallet.getNfts.bind(wallet),
                    sendTransaction: wallet.sendTransaction.bind(wallet),
                    getTransactions: wallet.getTransactions.bind(wallet),
                } as SolanaSmartWallet;
            }
            case "solana-mpc-wallet": {
                const wallet = new ISolanaMPCWallet(
                    this.apiClient,
                    new PublicKey(solanaResponse.address),
                    getConnectionFromEnvironment(this.apiClient.environment),
                    options?.experimental_callbacks ?? {}
                );
                return {
                    sendTransaction: wallet.sendTransaction.bind(wallet),
                    getBalances: wallet.getBalances.bind(wallet),
                    getAddress: wallet.getAddress.bind(wallet),
                    getPublicKey: wallet.getPublicKey.bind(wallet),
                    getNfts: wallet.getNfts.bind(wallet),
                    getTransactions: wallet.getTransactions.bind(wallet),
                } as SolanaMPCWallet;
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
