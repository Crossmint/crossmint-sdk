import { WebAuthnP256 } from "ox";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import { WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import type { Chain } from "../chains/chains";
import type {
    InternalSignerConfig,
    SignerConfigForChain,
    ExternalWalletInternalSignerConfig,
    NonCustodialSignerType,
} from "../signers/types";
import { Wallet } from "./wallet";
import { assembleSigner } from "../signers";
import type { WalletOptions } from "./types";
import { deepCompare } from "@/utils/signer-validation";
import { EvmNcsSigner } from "@/signers/non-custodial/evm-ncs-signer";
import { SolanaNcsSigner } from "@/signers/non-custodial/solana-ncs-signer";
import { isEVMBlockchain } from "@crossmint/common-sdk-base";

export type WalletArgsFor<C extends Chain> = {
    chain: C;
    signer: SignerConfigForChain<C>;
    owner?: string;
    options?: WalletOptions;
};

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>> {
        if (this.apiClient.isServerSide) {
            throw new WalletCreationError("getOrCreateWallet is not supported on server side");
        }

        const existingWallet = await this.apiClient.getWallet(
            `me:${args.chain === "solana" ? "solana-smart-wallet" : "evm-smart-wallet"}`
        );

        if (existingWallet && !("error" in existingWallet)) {
            await this.validateWalletConfig(existingWallet, args);
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
        let walletPayload: any;
        if (args.chain === "solana") {
            walletPayload = {
                type: "solana-smart-wallet",
                config: {
                    adminSigner: await this.configureSigner(args.chain, args.signer),
                },
                linkedUser: args.owner ?? undefined,
            };
        } else {
            walletPayload = {
                type: "evm-smart-wallet",
                config: {
                    adminSigner: await this.configureSigner(args.chain, args.signer),
                },
                linkedUser: args.owner ?? undefined,
            };
        }

        const walletResponse = await this.apiClient.createWallet(walletPayload);

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
                owner: walletResponse.linkedUser,
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
                switch (walletResponse.type) {
                    case "solana-smart-wallet":
                        address = walletResponse.config.adminSigner.address;
                        break;
                    case "evm-smart-wallet":
                        if (walletResponse.config.adminSigner.type === "evm-fireblocks-custodial") {
                            address = walletResponse.config.adminSigner.address;
                        }
                        break;
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
                if (
                    walletResponse.type === "evm-smart-wallet" &&
                    walletResponse.config.adminSigner.type === "evm-passkey"
                ) {
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
                        (walletResponse.type === "solana-smart-wallet" &&
                            walletResponse.config.adminSigner.type === "solana-keypair") ||
                        (walletResponse.type === "evm-smart-wallet" &&
                            walletResponse.config.adminSigner.type === "evm-keypair")
                    )
                ) {
                    throw new WalletCreationError("Wallet signer 'email' has no address");
                }

                const address = walletResponse.config.adminSigner.address;
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

            case "phone": {
                if (
                    !(
                        (walletResponse.type === "solana-smart-wallet" &&
                            walletResponse.config.adminSigner.type === "solana-keypair") ||
                        (walletResponse.type === "evm-smart-wallet" &&
                            walletResponse.config.adminSigner.type === "evm-keypair")
                    )
                ) {
                    throw new WalletCreationError("Wallet signer 'phone' has no address");
                }

                const address = walletResponse.config.adminSigner.address;
                const phone = signer.phone;
                return {
                    type: "phone",
                    phone,
                    signerAddress: address,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signer.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                };
            }
        }
    }

    private async configureSigner<C extends Chain>(chain: C, signer?: SignerConfigForChain<C>) {
        if (signer?.type === "passkey") {
            const passkeyName = signer.name ?? `Crossmint Wallet ${Date.now()}`;
            const passkeyCredential = signer.onCreatePasskey
                ? await signer.onCreatePasskey(passkeyName)
                : await WebAuthnP256.createCredential({ name: passkeyName });
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

        return await this.toExternalSignerConfig(chain, signer);
    }

    private async toExternalSignerConfig<C extends Chain>(
        chain: C,
        signer?: SignerConfigForChain<C>,
        existingWallet?: GetWalletSuccessResponse
    ) {
        if (!signer || signer.type === "api-key") {
            return {
                type: chain === "solana" ? "solana-fireblocks-custodial" : "evm-fireblocks-custodial",
            };
        }

        if (signer.type === "external-wallet") {
            return {
                type: chain === "solana" ? "solana-keypair" : "evm-keypair",
                address: signer.address,
            };
        }

        if (signer.type === "passkey" && existingWallet != null) {
            if (
                existingWallet?.type !== "evm-smart-wallet" ||
                existingWallet.config.adminSigner.type !== "evm-passkey"
            ) {
                throw new WalletCreationError("Passkey signer is not supported for this wallet type");
            }
            return {
                type: "evm-passkey",
                id: existingWallet.config.adminSigner.id,
                name: existingWallet.config.adminSigner.name,
                publicKey: {
                    x: existingWallet.config.adminSigner.publicKey.x,
                    y: existingWallet.config.adminSigner.publicKey.y,
                },
            };
        }

        if (signer.type === "email" || signer.type === "phone") {
            const { type, value } = this.getSignerTypeAndValue(signer);
            if (chain === "solana") {
                const ncsSignerAddress = await SolanaNcsSigner.pregenerateSigner(type, value, this.apiClient.crossmint);
                return {
                    type: "solana-keypair",
                    address: ncsSignerAddress,
                };
            } else if (isEVMBlockchain(chain)) {
                const ncsSignerAddress = await EvmNcsSigner.pregenerateSigner(type, value, this.apiClient.crossmint);
                return {
                    type: "evm-keypair",
                    address: ncsSignerAddress,
                };
            }
        }

        throw new Error("Invalid signer type");
    }

    private getSignerTypeAndValue(signer: SignerConfigForChain<Chain>): {
        type: NonCustodialSignerType;
        value: string;
    } {
        if (signer.type === "email") {
            const email = signer.email ?? this.apiClient.crossmint.experimental_customAuth?.email;
            if (email == null) {
                throw new Error("Email is required to create a wallet with email signer");
            }
            return { type: "email", value: email };
        } else if (signer.type === "phone") {
            const phone = signer.phone;
            if (phone == null) {
                throw new Error("Phone is required to create a wallet with phone signer");
            }
            return { type: "phone", value: phone };
        }
        throw new Error("Invalid signer type");
    }

    private async validateWalletConfig<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        args: WalletArgsFor<C>
    ): Promise<void> {
        if (args.owner != null && existingWallet.linkedUser != null && args.owner !== existingWallet.linkedUser) {
            throw new WalletCreationError("Wallet owner does not match existing wallet's linked user");
        }

        if (existingWallet.type !== "solana-smart-wallet" && existingWallet.type !== "evm-smart-wallet") {
            return;
        }

        const configuredArgsSigner = await this.toExternalSignerConfig(args.chain, args.signer, existingWallet);
        const existingWalletSigner = existingWallet.config.adminSigner as any;

        if (configuredArgsSigner && existingWalletSigner) {
            if (configuredArgsSigner.type !== existingWalletSigner.type) {
                throw new WalletCreationError(
                    "The wallet signer type provided in the wallet config does not match the existing wallet's adminSigner type"
                );
            }
            deepCompare(configuredArgsSigner, existingWalletSigner);
        }
    }
}
