import { WebAuthnP256 } from "ox";

import type {
    AdminSignerConfig,
    ApiClient,
    CreateWalletParams,
    GetWalletSuccessResponse,
    RegisterSignerPasskeyParams,
    DelegatedSigner as DelegatedSignerResponse,
    RegisterSignerParams,
} from "../api";
import { WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import type { Chain } from "../chains/chains";
import type { InternalSignerConfig, SignerConfigForChain } from "../signers/types";
import { Wallet } from "./wallet";
import { assembleSigner } from "../signers";
import type { DelegatedSigner, WalletArgsFor, WalletCreateArgs, WalletOptions } from "./types";
import { compareSignerConfigs } from "../utils/signer-validation";

const DELEGATED_SIGNER_MISMATCH_ERROR =
    "When 'delegatedSigners' is provided to a method that may fetch an existing wallet, each specified delegated signer must exist in that wallet's configuration.";

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<C extends Chain>(args: WalletCreateArgs<C>): Promise<Wallet<C>> {
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

    // Client-side
    public async getWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>>;
    // Server-side
    public async getWallet<C extends Chain>(walletLocator: string, args: WalletArgsFor<C>): Promise<Wallet<C>>;
    public async getWallet<C extends Chain>(
        argsOrLocator: string | WalletArgsFor<C>,
        maybeArgs?: WalletArgsFor<C>
    ): Promise<Wallet<C>> {
        let walletLocator: string;
        let args: WalletArgsFor<C>;

        if (typeof argsOrLocator === "string") {
            if (!this.apiClient.isServerSide) {
                throw new WalletCreationError(
                    "getWallet with walletLocator is not supported on client side, use getOrCreateWallet instead"
                );
            }
            if (maybeArgs == null) {
                throw new WalletCreationError("Args parameter is required when walletLocator is provided");
            }
            walletLocator = argsOrLocator;
            args = maybeArgs;
        } else {
            if (this.apiClient.isServerSide) {
                throw new WalletCreationError(
                    "getWallet on server side requires a walletLocator parameter. Use getWallet(walletLocator, args) instead."
                );
            }
            args = argsOrLocator;
            walletLocator = `me:${this.getChainType(args.chain)}:smart`;
        }

        const existingWallet = await this.apiClient.getWallet(walletLocator);
        if ("error" in existingWallet) {
            throw new WalletNotAvailableError(JSON.stringify(existingWallet));
        }

        return this.createWalletInstance(existingWallet, args);
    }

    public async createWallet<C extends Chain>(args: WalletCreateArgs<C>): Promise<Wallet<C>> {
        await args.options?.experimental_callbacks?.onWalletCreationStart?.();

        let adminSignerConfig = args.onCreateConfig?.adminSigner ?? args.signer;
        const delegatedSigners = await Promise.all(
            args.onCreateConfig?.delegatedSigners?.map(
                async (signer): Promise<DelegatedSigner | RegisterSignerParams> => {
                    if (signer.type === "passkey") {
                        return { signer: await this.createPasskeySigner(signer) };
                    }
                    return { signer: this.getSignerLocator(signer) };
                }
            ) ?? []
        );

        const tempArgs = { ...args, signer: adminSignerConfig };
        this.mutateSignerFromCustomAuth(tempArgs, true);
        adminSignerConfig = tempArgs.signer;

        const adminSigner =
            adminSignerConfig.type === "passkey"
                ? await this.createPasskeySigner(adminSignerConfig)
                : adminSignerConfig;

        const walletResponse = await this.apiClient.createWallet({
            type: "smart",
            chainType: this.getChainType(args.chain),
            config: {
                adminSigner,
                ...(args?.plugins ? { plugins: args.plugins } : {}),
                ...(delegatedSigners != null ? { delegatedSigners } : {}),
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
                const walletSigner = this.getWalletSigner(walletResponse, "api-key");

                return {
                    type: "api-key",
                    address: walletSigner.address,
                    locator: walletSigner.locator,
                };
            }

            case "external-wallet": {
                const walletSigner = this.getWalletSigner(walletResponse, "external-wallet");

                return { ...walletSigner, ...signerArgs } as InternalSignerConfig<C>;
            }
            case "passkey": {
                const walletSigner = this.getWalletSigner(walletResponse, "passkey");

                return {
                    type: "passkey",
                    id: walletSigner.id,
                    name: walletSigner.name,
                    locator: walletSigner.locator,
                    onCreatePasskey: signerArgs.onCreatePasskey,
                    onSignWithPasskey: signerArgs.onSignWithPasskey,
                };
            }
            case "email": {
                const walletSigner = this.getWalletSigner(walletResponse, "email");

                return {
                    type: "email",
                    email: walletSigner.email,
                    locator: "locator" in walletSigner ? walletSigner.locator : this.getSignerLocator(signerArgs),
                    address: "address" in walletSigner ? walletSigner.address : walletResponse.address,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signerArgs.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                };
            }

            case "phone": {
                const walletSigner = this.getWalletSigner(walletResponse, "phone");

                return {
                    type: "phone",
                    phone: walletSigner.phone,
                    locator: "locator" in walletSigner ? walletSigner.locator : this.getSignerLocator(signerArgs),
                    address: "address" in walletSigner ? walletSigner.address : walletResponse.address,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signerArgs.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                };
            }

            default:
                throw new Error("Invalid signer type");
        }
    }

    private getWalletSigner<C extends Chain, T extends SignerConfigForChain<C>["type"]>(
        wallet: GetWalletSuccessResponse,
        signerType: T
    ): Extract<AdminSignerConfig | DelegatedSignerResponse, { type: T }> {
        const adminSigner = (wallet.config as any)?.adminSigner as AdminSignerConfig;
        const delegatedSigners = ((wallet.config as any)?.delegatedSigners as DelegatedSignerResponse[]) || [];
        if (adminSigner?.type === signerType) {
            return adminSigner as Extract<AdminSignerConfig, { type: T }>;
        }
        const delegatedSigner = delegatedSigners.find((ds) => ds.type === signerType);
        if (delegatedSigner != null) {
            return delegatedSigner as Extract<DelegatedSignerResponse, { type: T }>;
        }
        throw new WalletCreationError(`${signerType} signer does not match the wallet's signer type`);
    }

    private async createPasskeySigner<C extends Chain>(
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
        args: WalletArgsFor<C> | WalletCreateArgs<C>
    ): void {
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

        if ("onCreateConfig" in args) {
            let expectedAdminSigner = args.onCreateConfig?.adminSigner ?? args.signer;
            const existingWalletSigner = (existingWallet?.config as any)?.adminSigner as AdminSignerConfig;

            const tempArgs = { ...args, signer: expectedAdminSigner };
            this.mutateSignerFromCustomAuth(tempArgs);
            expectedAdminSigner = tempArgs.signer;

            if (expectedAdminSigner != null && existingWalletSigner != null) {
                if (expectedAdminSigner.type !== existingWalletSigner.type) {
                    throw new WalletCreationError(
                        "The wallet signer type provided in onCreateConfig does not match the existing wallet's adminSigner type"
                    );
                }
                compareSignerConfigs(expectedAdminSigner, existingWalletSigner);
            }

            if (args.onCreateConfig?.delegatedSigners != null) {
                this.validateDelegatedSigners(existingWallet, args.onCreateConfig.delegatedSigners);
            }
        }

        this.validateSignerCanUseWallet(existingWallet, args.signer);
    }

    private validateSignerCanUseWallet<C extends Chain>(
        wallet: GetWalletSuccessResponse,
        signer: SignerConfigForChain<C>
    ): void {
        const adminSigner = (wallet.config as any)?.adminSigner as AdminSignerConfig;
        const delegatedSigners = ((wallet.config as any)?.delegatedSigners as DelegatedSignerResponse[]) || [];

        if (adminSigner != null && signer.type === adminSigner.type) {
            try {
                compareSignerConfigs(signer, adminSigner);
                return;
            } catch {}
        }

        const delegatedSigner = delegatedSigners.find((ds) => ds.type === signer.type);

        if (delegatedSigner != null) {
            try {
                compareSignerConfigs(signer, delegatedSigner);
                return;
            } catch {}
        }

        throw new WalletCreationError(
            `Signer cannot use wallet "${wallet.address}". The provided signer is neither the admin nor a delegated signer.`
        );
    }

    private getSignerLocator<C extends Chain>(signer: SignerConfigForChain<C> | RegisterSignerPasskeyParams): string {
        if (signer.type === "external-wallet") {
            return `external-wallet:${signer.address}`;
        }
        if (signer.type === "email" && signer.email) {
            return `email:${signer.email}`;
        }
        if (signer.type === "phone" && signer.phone) {
            return `phone:${signer.phone}`;
        }
        if (signer.type === "passkey" && "id" in signer) {
            return `passkey:${signer.id}`;
        }
        if (signer.type === "api-key") {
            return "api-key";
        }
        return signer.type;
    }

    private validateDelegatedSigners<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        inputDelegatedSigners: Array<SignerConfigForChain<C>>
    ): void {
        const existingDelegatedSigners = (existingWallet?.config as any)?.delegatedSigners as
            | DelegatedSignerResponse[]
            | undefined;

        // If no delegated signers specified in input, no validation needed
        if (inputDelegatedSigners.length === 0) {
            return;
        }

        // If input has delegated signers but wallet has none, that's an error
        if (existingDelegatedSigners == null || existingDelegatedSigners.length === 0) {
            throw new WalletCreationError(
                `${inputDelegatedSigners.length} delegated signer(s) specified, but wallet "${existingWallet.address}" has no delegated signers. ${DELEGATED_SIGNER_MISMATCH_ERROR}`
            );
        }

        for (const inputSigner of inputDelegatedSigners) {
            const matchingExistingSigner = existingDelegatedSigners.find(
                (existingSigner) => existingSigner.type === inputSigner.type
            );

            if (matchingExistingSigner == null) {
                const walletSigners = existingDelegatedSigners.map((s) => s.locator).join(", ");
                throw new WalletCreationError(
                    `Delegated signer '${inputSigner.type}' does not exist in wallet "${existingWallet.address}". Available delegated signers: ${walletSigners}. ${DELEGATED_SIGNER_MISMATCH_ERROR}`
                );
            }

            compareSignerConfigs(inputSigner, matchingExistingSigner);
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
