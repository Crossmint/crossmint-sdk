import { WebAuthnP256 } from "ox";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import { WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import type { Chain } from "../chains/chains";
import type { InternalSignerConfig, SignerConfigForChain, ExternalWalletInternalSignerConfig } from "../signers/types";
import { Wallet } from "./wallet";
import { assembleSigner } from "../signers";
import type { WalletOptions } from "./types";
import { EmailSigner } from "@/signers/email";

export type WalletArgsFor<C extends Chain> = {
    chain: C;
    signer?: SignerConfigForChain<C>;
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
            // TODO: check that WalletArgs are the same as existingWallet
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
        const signerConfig = this.toInternalSignerConfig(walletResponse, args.signer);
        return new Wallet(
            {
                chain: args.chain,
                address: walletResponse.address,
                signer: assembleSigner(args.chain, signerConfig),
                options: args.options,
            },
            this.apiClient
        );
    }

    private toInternalSignerConfig<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        signer?: SignerConfigForChain<C>
    ): InternalSignerConfig<C> {
        if (signer == null || signer.type === "api-key") {
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

        if (signer.type === "external-wallet") {
            return signer as ExternalWalletInternalSignerConfig<C>;
        }

        if (signer.type === "passkey") {
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
        }

        if (signer.type === "email") {
            let address;
            switch (walletResponse.type) {
                case "solana-smart-wallet":
                    address = walletResponse.config.adminSigner.address;
                    break;
                case "evm-smart-wallet":
                    if (walletResponse.config.adminSigner.type === "evm-keypair") {
                        address = walletResponse.config.adminSigner.address;
                    }
                    break;
            }
            if (address == null) {
                throw new WalletCreationError("Wallet signer 'email' has no address");
            }
            return {
                type: "email",
                email: signer.email,
                signerAddress: address,
                crossmint: this.apiClient.crossmint,
                onAuthRequired: signer.onAuthRequired,
                _handshakeParent: signer._handshakeParent,
            };
        }

        throw new Error("Invalid signer type");
    }

    private async configureSigner<C extends Chain>(chain: C, signer?: SignerConfigForChain<C>) {
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

        if (signer.type === "passkey") {
            const passkeyName = signer.name ?? `Crossmint Wallet ${Date.now()}`;
            const passkeyCredential = signer.onCreatePasskey
                ? await signer.onCreatePasskey(passkeyName)
                : await WebAuthnP256.createCredential({
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

        if (signer.type === "email") {
            if (signer.email == null) {
                throw new Error("Email is required to create a wallet with email signer");
            }
            if (chain !== "solana") {
                throw new Error("Email signer is only supported for Solana wallets");
            }

            const emailSignerAddress = await EmailSigner.pregenerateSigner(signer.email, this.apiClient.crossmint);
            return {
                type: "solana-keypair",
                address: emailSignerAddress,
            };
        }

        throw new Error("Invalid signer type");
    }
}
