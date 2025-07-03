import { WebAuthnP256 } from "ox";
import type { AdminSignerConfig, ApiClient, CreateWalletParams, GetWalletSuccessResponse } from "../api";
import { WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import type { Chain } from "../chains/chains";
import type { InternalSignerConfig, SignerConfigForChain, ExternalWalletInternalSignerConfig } from "../signers/types";
import { Wallet } from "./wallet";
import { assembleSigner } from "../signers";
import type { WalletArgsFor, WalletOptions } from "./types";
import { deepCompare } from "@/utils/signer-validation";

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>> {
        if (this.apiClient.isServerSide) {
            throw new WalletCreationError("getOrCreateWallet is not supported on server side");
        }

        const existingWallet = await this.apiClient.getWallet(`me:${args.chain === "solana" ? "solana" : "evm"}:smart`);

        if (existingWallet && !("error" in existingWallet)) {
            this.validateWalletConfig(existingWallet, args);
            return this.createWalletInstance(existingWallet, args);
        }

        return this.createWallet(args);
    }

    public async getWallet<C extends Chain>(walletLocator: string, args: WalletArgsFor<C>): Promise<Wallet<C>> {
        if (!this.apiClient.isServerSide) {
            throw new WalletCreationError("getWallet is not supported on client side, use getOrCreateWallet instead");
        }

        const walletResponse = await this.apiClient.getWallet(walletLocator);
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        return this.createWalletInstance(walletResponse, args);
    }

    public async createWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>> {
        await args.options?.experimental_callbacks?.onWalletCreationStart?.();

        const adminSigner = await this.configureSigner(args.chain, args.signer);

        const walletResponse = await this.apiClient.createWallet({
            type: "smart",
            chainType: args.chain === "solana" ? "solana" : "evm",
            config: {
                adminSigner,
            },
            owner: args.owner ?? undefined,
        } as CreateWalletParams);

        if ("error" in walletResponse) {
            throw new WalletCreationError(JSON.stringify(walletResponse));
        }

        return this.createWalletInstance(walletResponse, args);
    }

    private createWalletInstance<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        args: WalletArgsFor<C>
    ): Wallet<C> {
        const signerConfig = this.toInternalSignerConfig(walletResponse, args.signer, args.options);
        return new Wallet(
            {
                chain: args.chain,
                address: walletResponse.address,
                owner: walletResponse.owner,
                signer: assembleSigner(args.chain, signerConfig),
                options: args.options,
            },
            this.apiClient
        );
    }

    private toInternalSignerConfig<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        signer: SignerConfigForChain<C>,
        options?: WalletOptions
    ): InternalSignerConfig<C> {
        if (signer == null) {
            throw new WalletCreationError("Signer is required to create a wallet");
        }

        switch (signer.type) {
            case "api-key": {
                let address;
                if (
                    (walletResponse.chainType === "evm" || walletResponse.chainType === "solana") &&
                    walletResponse.config?.adminSigner.type === "api-key"
                ) {
                    address = walletResponse.config.adminSigner.address;
                }

                if (address == null) {
                    throw new WalletCreationError("Wallet signer 'api-key' has no address");
                }
                return {
                    type: "api-key",
                    address,
                };
            }

            case "external-wallet":
                return signer as ExternalWalletInternalSignerConfig<C>;

            case "passkey":
                if (walletResponse.chainType === "evm" && walletResponse.config?.adminSigner.type === "passkey") {
                    return {
                        type: "passkey",
                        id: walletResponse.config.adminSigner.id,
                        name: walletResponse.config.adminSigner.name,
                        onCreatePasskey: signer.onCreatePasskey,
                        onSignWithPasskey: signer.onSignWithPasskey,
                    };
                }
                throw new WalletCreationError("Passkey signer is not supported for this wallet type");

            case "email": {
                if (
                    !(
                        (walletResponse.chainType === "solana" || walletResponse.chainType === "evm") &&
                        walletResponse.config?.adminSigner.type === "email"
                    )
                ) {
                    throw new WalletCreationError("Wallet signer 'email' has no email address");
                }

                const address = walletResponse.config.adminSigner.email;
                const email = signer.email ?? this.apiClient.crossmint.experimental_customAuth?.email;
                return {
                    type: "email",
                    email,
                    signerAddress: address,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signer.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                };
            }

            default:
                throw new Error("Invalid signer type");
        }
    }

    private async configureSigner<C extends Chain>(
        chain: C,
        signer?: SignerConfigForChain<C>
    ): Promise<AdminSignerConfig> {
        if (signer?.type === "passkey") {
            if (chain === "solana") {
                throw new Error("Passkey signer is not supported for this wallet type");
            }
            const passkeyName = signer.name ?? `Crossmint Wallet ${Date.now()}`;
            const passkeyCredential = signer.onCreatePasskey
                ? await signer.onCreatePasskey(passkeyName)
                : await WebAuthnP256.createCredential({ name: passkeyName });
            return {
                type: "passkey",
                id: passkeyCredential.id,
                name: passkeyName,
                publicKey: {
                    x: passkeyCredential.publicKey.x.toString(),
                    y: passkeyCredential.publicKey.y.toString(),
                },
            };
        }

        return this.toExternalSignerConfig(signer);
    }

    private toExternalSignerConfig<C extends Chain>(
        signer?: SignerConfigForChain<C>,
        existingWallet?: GetWalletSuccessResponse
    ): AdminSignerConfig {
        if (signer == null || signer.type === "api-key") {
            return {
                type: "api-key",
            };
        }

        if (signer.type === "external-wallet") {
            if (signer.address == null) {
                throw new WalletCreationError("External wallet signer has no address");
            }
            return {
                type: "external-wallet",
                address: signer.address,
            };
        }

        if (signer.type === "passkey" && existingWallet != null) {
            if (existingWallet?.chainType !== "evm" || existingWallet.config?.adminSigner.type !== "passkey") {
                throw new WalletCreationError("Passkey signer is not supported for this wallet type");
            }
            return {
                type: "passkey",
                id: existingWallet.config.adminSigner.id,
                name: existingWallet.config.adminSigner.name,
                publicKey: {
                    x: existingWallet.config.adminSigner.publicKey.x,
                    y: existingWallet.config.adminSigner.publicKey.y,
                },
            };
        }

        if (signer.type === "email") {
            const email = signer.email ?? this.apiClient.crossmint.experimental_customAuth?.email;
            if (email == null) {
                throw new Error("Email is required to create a wallet with email signer");
            }
            return {
                type: "email",
                email,
            };
        }

        throw new Error("Invalid signer type");
    }

    private validateWalletConfig<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        args: WalletArgsFor<C>
    ): void {
        if (args.owner != null && existingWallet.owner != null && args.owner !== existingWallet.owner) {
            throw new WalletCreationError("Wallet owner does not match existing wallet's linked user");
        }

        if (existingWallet.type !== "smart") {
            return;
        }

        const configuredArgsSigner = this.toExternalSignerConfig(args.signer, existingWallet);
        const existingWalletSigner = (existingWallet?.config as any)?.adminSigner as AdminSignerConfig;

        if (configuredArgsSigner != null && existingWalletSigner != null) {
            if (configuredArgsSigner.type !== existingWalletSigner.type) {
                throw new WalletCreationError(
                    "The wallet signer type provided in the wallet config does not match the existing wallet's adminSigner type"
                );
            }
            deepCompare(configuredArgsSigner, existingWalletSigner);
        }
    }
}
