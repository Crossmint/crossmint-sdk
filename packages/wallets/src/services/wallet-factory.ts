import type { Address } from "viem";
import { SolanaMPCWallet } from "../solana";
import type { WalletTypeToArgs, WalletTypeToWallet } from "./types";
import type { ApiClient, CreateWalletResponse } from "../api";
import { type EVMSigner, EVMSmartWallet } from "../evm";
import { SolanaSmartWallet } from "../solana";
import { PublicKey } from "@solana/web3.js";
import { parseSolanaSignerInput } from "../solana/types/signers";

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        args: WalletTypeToArgs[WalletType]
    ): Promise<WalletTypeToWallet[WalletType] | null> {
        if (type === "evm-smart-wallet") {
            const { chain, adminSigner, linkedUser } = args as WalletTypeToArgs["evm-smart-wallet"];

            // Check for existing wallet
            if (adminSigner == null) {
                const existingWalletResponse = await this.apiClient.getWallet(linkedUser, "evm-smart-wallet");
                if (existingWalletResponse != null) {
                    this.assertCorrectWalletType(existingWalletResponse, "evm-smart-wallet");
                    return new EVMSmartWallet(chain, this.apiClient, existingWalletResponse.address as Address, {
                        ...(existingWalletResponse.config.adminSigner as EVMSigner),
                    }) as WalletTypeToWallet[WalletType];
                } else {
                    return null;
                }
            }

            // Create new wallet
            const walletResponse = await this.apiClient.createWallet({
                type: "evm-smart-wallet",
                config: {
                    adminSigner,
                },
                linkedUser,
            });
            this.assertCorrectWalletType(walletResponse, "evm-smart-wallet");
            const adminSignerLocator = walletResponse.config.adminSigner.locator;
            return new EVMSmartWallet(chain, this.apiClient, walletResponse.address as Address, {
                ...adminSigner,
                locator: adminSignerLocator,
            }) as WalletTypeToWallet[WalletType];
        }
        if (type === "solana-smart-wallet") {
            const { adminSigner: adminSignerInput, linkedUser } = args as WalletTypeToArgs["solana-smart-wallet"];
            const walletResponse = await this.apiClient.createWallet({
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
            this.assertCorrectWalletType(walletResponse, "solana-smart-wallet");
            return new SolanaSmartWallet(
                this.apiClient,
                new PublicKey(walletResponse.address),
                adminSignerInput ?? {
                    type: "solana-fireblocks-custodial",
                }
            ) as WalletTypeToWallet[WalletType];
        }
        if (type === "solana-mpc-wallet") {
            const { linkedUser } = args as WalletTypeToArgs["solana-mpc-wallet"];
            const walletResponse = await this.apiClient.createWallet({
                type: "solana-mpc-wallet",
                linkedUser,
            });
            this.assertCorrectWalletType(walletResponse, "solana-mpc-wallet");
            return new SolanaMPCWallet(
                this.apiClient,
                new PublicKey(walletResponse.address)
            ) as WalletTypeToWallet[WalletType];
        }
        throw new Error("Not implemented");
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
