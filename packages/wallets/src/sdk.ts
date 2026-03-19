import { createCrossmint, type Crossmint } from "@crossmint/common-sdk-base";
import { ApiClient, type RegisterSignerPasskeyParams } from "./api";
import { WalletFactory } from "./wallets/wallet-factory";
import type { Wallet } from "./wallets/wallet";
import type { Chain } from "./chains/chains";
import type { WalletArgsFor, WalletCreateArgs } from "./wallets/types";
import { initWalletsLogger, walletsLogger } from "./logger";
import { createDeviceSigner, type DeviceSignerKeyStorage } from "./utils/device-signers";
import { WebAuthnP256 } from "ox";

export class CrossmintWallets {
    private readonly walletFactory: WalletFactory;

    private constructor(crossmint: Crossmint) {
        initWalletsLogger(crossmint.apiKey);
        const apiClient = new ApiClient(crossmint);
        this.walletFactory = new WalletFactory(apiClient);

        walletsLogger.info("wallets.sdk.initialized");
    }

    /**
     * Initialize the Wallets SDK
     * @param crossmint - Crossmint data (use `createCrossmint` to initialize)
     * @returns A new CrossmintWallets instance
     */
    public static from(crossmint: Crossmint): CrossmintWallets {
        return new CrossmintWallets(crossmint);
    }

    /**
     * Get an existing wallet.
     * Works on both client and server side.
     * On client side, provide wallet args directly.
     * On server side, provide the wallet locator string and wallet args.
     * If no signer is provided, the wallet will be read-only.
     * @param argsOrLocator - Wallet args (client) or wallet locator string (server)
     * @param maybeArgs - Wallet args (required when using wallet locator on server side)
     * @returns A wallet if found, throws WalletNotAvailableError if not found
     */
    public async getWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>>;
    public async getWallet<C extends Chain>(walletLocator: string, args: WalletArgsFor<C>): Promise<Wallet<C>>;
    public async getWallet<C extends Chain>(
        argsOrLocator: string | WalletArgsFor<C>,
        maybeArgs?: WalletArgsFor<C>
    ): Promise<Wallet<C>> {
        if (typeof argsOrLocator === "string") {
            if (maybeArgs == null) {
                throw new Error("Args parameter is required when walletLocator is provided");
            }
            return await this.walletFactory.getWallet(argsOrLocator, maybeArgs);
        }
        return await this.walletFactory.getWallet(argsOrLocator);
    }

    /**
     * Create a new wallet.
     * Works on both client and server side.
     * Either a signer or recovery must be provided.
     * If no signer is provided but recovery is set, the wallet will be read-only.
     * @param options - Wallet creation options
     * @returns A new wallet
     */
    public async createWallet<C extends Chain>(options: WalletCreateArgs<C>): Promise<Wallet<C>> {
        return await this.walletFactory.createWallet(options);
    }

    public async createDeviceSigner(deviceKeyStorage: DeviceSignerKeyStorage) {
        return await createDeviceSigner(deviceKeyStorage);
    }

    public async createPasskeySigner(passkeyName: string): Promise<RegisterSignerPasskeyParams> {
        const passkeyCredential = await WebAuthnP256.createCredential({ name: passkeyName });
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
}

export { Crossmint };
export { createCrossmint };
