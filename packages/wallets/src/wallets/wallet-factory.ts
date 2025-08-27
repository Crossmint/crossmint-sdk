import { WebAuthnP256 } from "ox";

import type {
    AdminSignerConfig,
    ApiClient,
    CreateWalletParams,
    GetWalletSuccessResponse,
    RegisterSignerPasskeyParams,
    DelegatedSigner as DelegatedSignerResponse,
} from "../api";
import { WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import type { Chain } from "../chains/chains";
import type { InternalSignerConfig, SignerConfigForChain } from "../signers/types";
import { Wallet } from "./wallet";
import { assembleSigner } from "../signers";
import type { WalletArgsFor, WalletOptions } from "./types";
import { compareSignerConfigs } from "../utils/signer-validation";

const DELEGATED_SIGNER_MISMATCH_ERROR =
    "When 'delegatedSigners' is provided to a method that may fetch an existing wallet, that wallet must have exactly matching delegated signers.";

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>> {
        if (this.apiClient.isServerSide) {
            throw new WalletCreationError(
                "getOrCreateWallet can only be called from client-side code.\n- Make sure you're running this in the browser (or another client environment), not on your server.\n- Use your Crossmint Client API Key (not a server key)."
            );
        }

        const existingWallet = await this.apiClient.getWallet(`me:${this.getChainType(args.chain)}:smart`);

        if (existingWallet != null && !("error" in existingWallet)) {
            return this.createWalletInstance(existingWallet, args);
        }

        return this.createWallet(args);
    }

    public async getWallet<C extends Chain>(walletLocator: string, args: WalletArgsFor<C>): Promise<Wallet<C>> {
        if (!this.apiClient.isServerSide) {
            throw new WalletCreationError("getWallet is not supported on client side, use getOrCreateWallet instead");
        }

        const existingWallet = await this.apiClient.getWallet(walletLocator);
        if ("error" in existingWallet) {
            throw new WalletNotAvailableError(JSON.stringify(existingWallet));
        }

        return this.createWalletInstance(existingWallet, args);
    }

    public async createWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>> {
        await args.options?.experimental_callbacks?.onWalletCreationStart?.();

        this.mutateSignerFromCustomAuth(args, true);

        if (args.delegatedSigners != null && args.chain !== "solana") {
            throw new WalletCreationError("Delegated signers are only supported for Solana smart wallets");
        }

        const adminSigner =
            args.signer.type === "passkey" ? await this.createPasskeyAdminSigner(args.signer) : args.signer;

        const walletResponse = await this.apiClient.createWallet({
            type: "smart",
            chainType: this.getChainType(args.chain),
            config: {
                adminSigner,
                ...(args?.plugins ? { plugins: args.plugins } : {}),
                ...(args.chain === "solana" && args.delegatedSigners != null
                    ? { delegatedSigners: args.delegatedSigners }
                    : {}),
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
        this.validateExistingWalletConfig(walletResponse, args);

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
        signerArgs: SignerConfigForChain<C>,
        options?: WalletOptions
    ): InternalSignerConfig<C> {
        if (
            !(
                walletResponse.chainType === "evm" ||
                walletResponse.chainType === "solana" ||
                walletResponse.chainType === "stellar"
            )
        ) {
            throw new WalletCreationError(`Wallet type ${walletResponse.chainType} is not supported`);
        }

        if (signerArgs == null && walletResponse.config?.adminSigner == null) {
            throw new WalletCreationError("Signer is required to create a wallet");
        }

        switch (signerArgs.type) {
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

                return { ...walletResponse.config.adminSigner, ...signerArgs } as InternalSignerConfig<C>;

            case "passkey":
                if (walletResponse.config?.adminSigner.type !== "passkey") {
                    throw new WalletCreationError("Passkey signer does not match the wallet's signer type");
                }

                return {
                    type: "passkey",
                    id: walletResponse.config.adminSigner.id,
                    name: walletResponse.config.adminSigner.name,
                    locator: walletResponse.config.adminSigner.locator,
                    onCreatePasskey: signerArgs.onCreatePasskey,
                    onSignWithPasskey: signerArgs.onSignWithPasskey,
                };

            case "email": {
                if (walletResponse.config?.adminSigner.type !== "email") {
                    throw new WalletCreationError("Email signer does not match the wallet's signer type");
                }

                const { locator, email } = walletResponse.config.adminSigner;
                return {
                    type: "email",
                    email,
                    locator,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signerArgs.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                };
            }

            case "phone": {
                if (walletResponse.config?.adminSigner.type !== "phone") {
                    throw new WalletCreationError("Phone signer does not match the wallet's signer type");
                }

                const { locator, phone } = walletResponse.config.adminSigner;
                return {
                    type: "phone",
                    phone,
                    locator,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signerArgs.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                };
            }

            default:
                throw new Error("Invalid signer type");
        }
    }

    private async createPasskeyAdminSigner<C extends Chain>(
        signer: SignerConfigForChain<C>
    ): Promise<RegisterSignerPasskeyParams> {
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

    private mutateSignerFromCustomAuth<C extends Chain>(args: WalletArgsFor<C>, isNewWalletSigner = false): void {
        const { experimental_customAuth } = this.apiClient.crossmint;
        if (args.signer.type === "email" && experimental_customAuth?.email != null) {
            args.signer.email = args.signer.email ?? experimental_customAuth.email;
        }
        if (args.signer.type === "phone" && experimental_customAuth?.phone != null) {
            args.signer.phone = args.signer.phone ?? experimental_customAuth.phone;
        }
        if (args.signer.type === "external-wallet" && experimental_customAuth?.externalWalletSigner != null) {
            args.signer = isNewWalletSigner
                ? ({
                      type: "external-wallet",
                      address: experimental_customAuth.externalWalletSigner.address,
                  } as SignerConfigForChain<C>)
                : (experimental_customAuth.externalWalletSigner as SignerConfigForChain<C>);
        }
        return;
    }

    private validateExistingWalletConfig<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        args: WalletArgsFor<C>
    ): void {
        this.mutateSignerFromCustomAuth(args);

        if (args.owner != null && existingWallet.owner != null && args.owner !== existingWallet.owner) {
            throw new WalletCreationError("Wallet owner does not match existing wallet's linked user");
        }

        if (
            (args.chain === "solana" && existingWallet.chainType !== "solana") ||
            (args.chain !== "solana" && existingWallet.chainType === "solana") ||
            (args.chain === "stellar" && existingWallet.chainType !== "stellar") ||
            (args.chain !== "stellar" && existingWallet.chainType === "stellar")
        ) {
            throw new WalletCreationError(
                `Wallet chain does not match existing wallet's chain. You must use chain: ${existingWallet.chainType}.`
            );
        }

        if (existingWallet.type !== "smart") {
            return;
        }

        const adminSignerArgs = args.signer;
        const existingWalletSigner = (existingWallet?.config as any)?.adminSigner as AdminSignerConfig;

        if (adminSignerArgs != null && existingWalletSigner != null) {
            if (adminSignerArgs.type !== existingWalletSigner.type) {
                throw new WalletCreationError(
                    "The wallet signer type provided in the wallet config does not match the existing wallet's adminSigner type"
                );
            }
            compareSignerConfigs(adminSignerArgs, existingWalletSigner);
        }

        if (args.delegatedSigners != null && args.chain === "solana") {
            const existingDelegatedSigners = (existingWallet?.config as any)?.delegatedSigners as
                | DelegatedSignerResponse[]
                | undefined;

            if (existingDelegatedSigners == null || existingDelegatedSigners.length === 0) {
                if (args.delegatedSigners.length > 0) {
                    throw new WalletCreationError(
                        `${args.delegatedSigners.length} delegated signer(s) were specified, but wallet "${existingWallet.address}" has no delegated signers.\n${DELEGATED_SIGNER_MISMATCH_ERROR}`
                    );
                }

                return; // Both wallet and args have no delegated signers - this is valid
            }

            if (args.delegatedSigners.length !== existingDelegatedSigners.length) {
                throw new WalletCreationError(
                    `${args.delegatedSigners.length} delegated signer(s) were specified, but wallet "${existingWallet.address}" has ${existingDelegatedSigners.length} delegated signers.\n${DELEGATED_SIGNER_MISMATCH_ERROR}`
                );
            }

            for (const argSigner of args.delegatedSigners) {
                const matchingExistingSigner = existingDelegatedSigners.find(
                    (existingSigner) => existingSigner.locator === argSigner.signer
                );

                if (matchingExistingSigner == null) {
                    const walletSigners = existingDelegatedSigners.map((s) => s.locator).join(", ");
                    throw new WalletCreationError(
                        `Delegated signer '${argSigner.signer}' is not valid for wallet "${existingWallet.address}". This wallet's delegated signers are: ${walletSigners}.\n${DELEGATED_SIGNER_MISMATCH_ERROR}`
                    );
                }
            }
        }
    }

    private getChainType(chain: Chain): "solana" | "evm" | "stellar" {
        if (chain === "solana") {
            return "solana";
        }
        if (chain === "stellar") {
            return "stellar";
        }
        return "evm";
    }
}
