import { EVMNonCustodialSigner, SolanaNonCustodialSigner, StellarNonCustodialSigner } from "./non-custodial";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";
import { EVMExternalWalletSigner } from "./evm-external-wallet";
import { PasskeySigner } from "./passkey";
import { EVMApiKeySigner } from "./evm-api-key";
import { SolanaApiKeySigner } from "./solana-api-key";
import type { Chain } from "../chains/chains";
import type {
    InternalSignerConfig,
    Signer,
    SolanaExternalWalletInternalSignerConfig,
    EvmExternalWalletInternalSignerConfig,
    StellarExternalWalletInternalSignerConfig,
} from "./types";
import { StellarExternalWalletSigner } from "./stellar-external-wallet";
import { DeviceSigner } from "./device";
import type { DeviceSignerKeyStorage } from "../utils/device-signers/DeviceSignerKeyStorage";
import { WalletCreationError } from "@/utils/errors";

export function assembleSigner<C extends Chain>(
    chain: C,
    config: InternalSignerConfig<C>,
    deviceSignerKeyStorage?: DeviceSignerKeyStorage
): Signer {
    switch (config.type) {
        case "email":
        case "phone":
            if (chain === "solana") {
                return new SolanaNonCustodialSigner(config);
            }
            if (chain === "stellar") {
                return new StellarNonCustodialSigner(config);
            }
            return new EVMNonCustodialSigner(config);
        case "api-key":
            return chain === "solana" ? new SolanaApiKeySigner(config) : new EVMApiKeySigner(config);

        case "external-wallet":
            if (chain === "solana") {
                return new SolanaExternalWalletSigner(config as SolanaExternalWalletInternalSignerConfig);
            }
            if (chain === "stellar") {
                return new StellarExternalWalletSigner(config as StellarExternalWalletInternalSignerConfig);
            }
            return new EVMExternalWalletSigner(config as EvmExternalWalletInternalSignerConfig);

        case "passkey":
            return new PasskeySigner(config);

        case "device":
            if (deviceSignerKeyStorage == null) {
                throw new WalletCreationError("Device signer key storage is required for device signers");
            }
            return new DeviceSigner(config, deviceSignerKeyStorage);
    }
}
