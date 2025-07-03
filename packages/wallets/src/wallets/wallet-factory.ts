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

        if (existingWallet != null && !("error" in existingWallet)) {
            this.validateExistingWalletConfig(existingWallet, args);
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

        this.validateSigner(args.signer);

        const adminSigner =
            args.signer.type === "passkey" ? await this.createPasskeyAdminSigner(args.signer) : args.signer;

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

        if (!(walletResponse.chainType === "evm" || walletResponse.chainType === "solana")) {
            throw new WalletCreationError(`Wallet type ${walletResponse.chainType} is not supported`);
        }

        switch (signer.type) {
            case "api-key": {
                if (walletResponse.config?.adminSigner.type !== "api-key") {
                    throw new WalletCreationError("API key signer does not match the wallet's signer type");
                }

                return {
                    type: "api-key",
                    address: walletResponse.config.adminSigner.address,
                    locator: walletResponse.config.adminSigner.locator,
                };
            }

            case "external-wallet":
                if (walletResponse.config?.adminSigner.type !== "external-wallet") {
                    throw new WalletCreationError("External wallet signer does not match the wallet's signer type");
                }
                return {
                    ...signer,
                    locator: walletResponse.config.adminSigner.locator,
                } as ExternalWalletInternalSignerConfig<C>;

            case "passkey":
                if (walletResponse.config?.adminSigner.type !== "passkey") {
                    throw new WalletCreationError("Passkey signer does not match the wallet's signer type");
                }
                return {
                    type: "passkey",
                    id: walletResponse.config.adminSigner.id,
                    name: walletResponse.config.adminSigner.name,
                    locator: walletResponse.config.adminSigner.locator,
                    onCreatePasskey: signer.onCreatePasskey,
                    onSignWithPasskey: signer.onSignWithPasskey,
                };

            case "email": {
                if (walletResponse.config?.adminSigner.type !== "email") {
                    throw new WalletCreationError("Email signer does not match the wallet's signer type");
                }

                const locator = walletResponse.config.adminSigner.locator;
                const email = signer.email ?? this.apiClient.crossmint.experimental_customAuth?.email;
                return {
                    type: "email",
                    email,
                    locator,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signer.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                };
            }

            default:
                throw new Error("Invalid signer type");
        }
    }

    private validateSigner<C extends Chain>(signer?: SignerConfigForChain<C>): void {
        if (signer == null || signer.type === "api-key") {
            return;
        }
        switch (signer.type) {
            case "external-wallet":
                if (!signer.address) {
                    throw new WalletCreationError("External wallet signer has no address");
                }
                break;
            case "email":
                const email = signer.email ?? this.apiClient.crossmint.experimental_customAuth?.email;
                if (email == null) {
                    throw new Error("Email is required to create a wallet with email signer");
                }
                break;
            case "passkey":
                break;
            default:
                throw new Error("Invalid signer type");
        }
    }

    private async createPasskeyAdminSigner<C extends Chain>(signer: SignerConfigForChain<C>) {
        if (signer.type !== "passkey") {
            throw new Error("Signer is not a passkey");
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

    private validateExistingWalletConfig<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        args: WalletArgsFor<C>
    ): void {
        if (args.owner != null && existingWallet.owner != null && args.owner !== existingWallet.owner) {
            throw new WalletCreationError("Wallet owner does not match existing wallet's linked user");
        }

        if (existingWallet.type !== "smart") {
            return;
        }

        this.validateSigner(args.signer);

        const adminSignerArgs = args.signer;
        const existingWalletSigner = (existingWallet?.config as any)?.adminSigner as AdminSignerConfig;

        if (adminSignerArgs != null && existingWalletSigner != null) {
            if (adminSignerArgs.type !== existingWalletSigner.type) {
                throw new WalletCreationError(
                    "The wallet signer type provided in the wallet config does not match the existing wallet's adminSigner type"
                );
            }
            deepCompare(adminSignerArgs, existingWalletSigner);
        }
    }
}
