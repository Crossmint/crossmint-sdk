import type { ApiClient, GetWalletSuccessResponse } from "../api";
import { WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import { Chain } from "../chains/chains";
import { SignerConfigForChain } from "../signers/types";
import { Wallet } from "./wallet";
import { WebAuthnP256 } from "ox";
import { createSigner } from "../signers";

export type WalletOptionsFor<C extends Chain> = {
    chain: C;
    signer?: SignerConfigForChain<C>;
    owner?: string;
};

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    public async getOrCreateWallet<C extends Chain>(
        options: WalletOptionsFor<C>
    ): Promise<Wallet<C>> {
        if (this.apiClient.isServerSide) {
            throw new WalletCreationError(
                "getOrCreateWallet is not supported on server side"
            );
        }

        return await this.getOrCreateWalletInternal(options);
    }

    public async getWallet<C extends Chain>(
        walletLocator: string,
        options: WalletOptionsFor<C>
    ): Promise<Wallet<C>> {
        if (!this.apiClient.isServerSide) {
            throw new WalletCreationError(
                "getWallet is not supported on client side, use getOrCreateWallet instead"
            );
        }

        const walletResponse = await this.apiClient.getWallet(walletLocator);
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        return this.createWalletInstance(walletResponse, options);
    }

    public async createWallet<C extends Chain>(
        options: WalletOptionsFor<C>
    ): Promise<Wallet<C>> {
        let walletPayload: any;
        if (options.chain === "solana") {
            walletPayload = {
                type: "solana-smart-wallet",
                config: {
                    adminSigner: await this.configureSigner(
                        options.chain,
                        options.signer
                    ),
                },
                linkedUser: options.owner ?? undefined,
            };
        } else {
            walletPayload = {
                type: "evm-smart-wallet",
                config: {
                    adminSigner: await this.configureSigner(
                        options.chain,
                        options.signer
                    ),
                },
                linkedUser: options.owner ?? undefined,
            };
        }

        const walletResponse = await this.apiClient.createWallet(walletPayload);

        if ("error" in walletResponse) {
            throw new WalletCreationError(JSON.stringify(walletResponse));
        }

        return this.createWalletInstance(walletResponse, options);
    }

    private async getOrCreateWalletInternal<C extends Chain>(
        options: WalletOptionsFor<C>
    ): Promise<Wallet<C>> {
        const existingWallet = await this.apiClient.getWallet(
            `me:${
                options.chain === "solana"
                    ? "solana-smart-wallet"
                    : "evm-smart-wallet"
            }`
        );

        if (existingWallet && !("error" in existingWallet)) {
            return this.createWalletInstance(existingWallet, options);
        }

        return this.createWallet(options);
    }

    private createWalletInstance<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        options: WalletOptionsFor<C>
    ): Wallet<C> {
        return Wallet.fromAPIResponse(
            {
                chain: options.chain,
                address: walletResponse.address,
                signer: createSigner(
                    options.chain,
                    options.signer ?? { type: "api-key" }
                ),
            },
            this.apiClient
        );
    }

    private async configureSigner<C extends Chain>(
        chain: C,
        signer?: SignerConfigForChain<C>
    ) {
        if (!signer || signer.type === "api-key") {
            return {
                type:
                    chain === "solana"
                        ? "solana-fireblocks-custodial"
                        : "evm-fireblocks-custodial",
            };
        }

        if (signer.type === "external-wallet") {
            return {
                type: chain === "solana" ? "solana-keypair" : "evm-keypair",
                address: signer.address,
            };
        }

        if (signer.type === "passkey") {
            // Create a passkey
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

        throw new Error("Invalid signer type");
    }
}
