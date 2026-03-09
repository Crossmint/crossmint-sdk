import { createCrossmint, type Crossmint } from "@crossmint/common-sdk-base";
import { ApiClient } from "./api";
import { WalletFactory } from "./wallets/wallet-factory";
import type { Wallet } from "./wallets/wallet";
import type { Chain } from "./chains/chains";
import type { WalletArgsFor, WalletCreateArgs, WalletOptions } from "./wallets/types";
import { initWalletsLogger, walletsLogger } from "./logger";
import type { SignerConfigForChain, DeviceSignerConfig, CreatedDeviceSigner } from "./signers/types";
import type { DeviceSignerKeyStorage } from "./utils/device-signers/DeviceSignerKeyStorage";

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
     * Create a device signer configuration on the client.
     * The returned object is serializable and can be sent to the server
     * to be included in `delegatedSigners` when creating a wallet server-side.
     *
     * @param config - Device signer configuration with biometric policy
     * @param deviceSignerKeyStorage - Storage for device signer keys
     * @returns A `CreatedDeviceSigner` that can be sent to the server
     */
    public async createDeviceSigner(
        config: DeviceSignerConfig,
        deviceSignerKeyStorage: DeviceSignerKeyStorage
    ): Promise<CreatedDeviceSigner> {
        const publicKey = await deviceSignerKeyStorage.generateKey({
            biometricPolicy: config.biometricPolicy,
            ...(config.biometricPolicy === "session" && { biometricExpirationTime: config.biometricExpirationTime }),
        });

        return {
            type: "device",
            publicKey,
            biometricPolicy: config.biometricPolicy,
            ...(config.biometricPolicy === "session" && config.biometricExpirationTime != null
                ? { biometricExpirationTime: config.biometricExpirationTime }
                : {}),
        };
    }

    /**
     * Get an existing wallet
     * Can be called on the client side or server side
     * If called on the client side, just the wallet options must be provided
     * If called on the server side, the wallet locator and options must be provided
     * @param argsOrLocator - Wallet locator or wallet options
     * @param maybeArgs - Wallet options
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
     * - **Client-side**: If a wallet already exists, returns the existing wallet (idempotent).
     *   Pass an optional `signer` to make the wallet operational, or omit it for a read-only wallet.
     * - **Server-side**: Creates a new wallet with the given admin signer and optional delegated signers.
     *   Device signers must include a `publicKey` (from `createDeviceSigner`).
     *
     * @param options - Wallet creation options
     * @returns A new or existing wallet
     */
    public async createWallet<C extends Chain>(options: WalletCreateArgs<C>): Promise<Wallet<C>> {
        return await this.walletFactory.createWallet(options);
    }

    /**
     * @internal
     */
    async assembleSigner(
        args: WalletArgsFor<Chain>,
        signerConfig: SignerConfigForChain<Chain>,
        options?: WalletOptions
    ) {
        return await this.walletFactory.assembleSigner(args, signerConfig, options);
    }
}

export { Crossmint };
export { createCrossmint };
