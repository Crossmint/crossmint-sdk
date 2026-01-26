import { EVMNonCustodialSigner, SolanaNonCustodialSigner, StellarNonCustodialSigner } from "./non-custodial";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";
import { EVMExternalWalletSigner } from "./evm-external-wallet";
import { PasskeySigner } from "./passkey";
import { EVMApiKeySigner } from "./evm-api-key";
import { SolanaApiKeySigner } from "./solana-api-key";
import type { Chain } from "../chains/chains";
import type { InternalSignerConfig, Signer } from "./types";
import { StellarExternalWalletSigner } from "./stellar-external-wallet";
import type { DeviceSignerStorage } from "./device-signer";

export function assembleSigner<C extends Chain>(
    chain: C,
    config: InternalSignerConfig<C>,
    walletAddress: string,
    deviceSignerEnabled: boolean,
    deviceSignerStorage?: DeviceSignerStorage
): Signer {
    switch (config.type) {
        case "email":
        case "phone":
            if (chain === "solana") {
                return new SolanaNonCustodialSigner(config, walletAddress, deviceSignerEnabled, deviceSignerStorage);
            }
            if (chain === "stellar") {
                return new StellarNonCustodialSigner(config, walletAddress, deviceSignerEnabled, deviceSignerStorage);
            }
            return new EVMNonCustodialSigner(config, deviceSignerStorage);
        case "api-key":
            return chain === "solana" ? new SolanaApiKeySigner(config) : new EVMApiKeySigner(config);

        case "external-wallet":
            if (chain === "solana") {
                return new SolanaExternalWalletSigner(config, walletAddress, deviceSignerEnabled, deviceSignerStorage);
            }
            if (chain === "stellar") {
                return new StellarExternalWalletSigner(config, walletAddress, deviceSignerEnabled, deviceSignerStorage);
            }
            return new EVMExternalWalletSigner(config);

        case "passkey":
            return new PasskeySigner(config);
    }
}
