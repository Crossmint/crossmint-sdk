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
     * For browser usage, you can use the SDK's `IframeDeviceSignerKeyStorage` as the storage parameter.
     *
     * @param config - Device signer configuration with biometric policy
     * @param deviceSignerKeyStorage - Storage for device signer keys
     * @returns A `CreatedDeviceSigner` that can be sent to the server
     */
    public async createDeviceSigner(
        config: DeviceSignerConfig,
        deviceSignerKeyStorage: DeviceSignerKeyStorage
    ): Promise<CreatedDeviceSigner> {
        const publicKeyBase64 = await deviceSignerKeyStorage.generateKey({
            biometricPolicy: config.biometricPolicy,
            ...(config.biometricPolicy === "session" && { biometricExpirationTime: config.biometricExpirationTime }),
        });

        const publicKey = parseUncompressedP256PublicKey(publicKeyBase64);

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
     * Create a new wallet
     * @param options - Wallet creation options
     * @returns A new wallet
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

/**
 * Parse an uncompressed P-256 public key from base64 into {x, y} hex coordinates.
 * Uncompressed format: 0x04 || X (32 bytes) || Y (32 bytes) = 65 bytes total.
 */
function parseUncompressedP256PublicKey(base64: string): { x: string; y: string } {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    if (bytes.length !== 65 || bytes[0] !== 0x04) {
        throw new Error("Invalid uncompressed P-256 public key");
    }

    const toHex = (slice: Uint8Array) =>
        Array.from(slice)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

    return {
        x: `0x${toHex(bytes.slice(1, 33))}`,
        y: `0x${toHex(bytes.slice(33, 65))}`,
    };
}

export { Crossmint };
export { createCrossmint };
