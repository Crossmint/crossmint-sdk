import { EVMNonCustodialSigner, SolanaNonCustodialSigner, StellarNonCustodialSigner } from "./non-custodial";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";
import { EVMExternalWalletSigner } from "./evm-external-wallet";
import { PasskeySigner } from "./passkey";
import { EVMApiKeySigner } from "./evm-api-key";
import { SolanaApiKeySigner } from "./solana-api-key";
import type { Chain } from "../chains/chains";
import type { InternalSignerConfig, Signer } from "./types";
import { StellarExternalWalletSigner } from "./stellar-external-wallet";

export function assembleSigner<C extends Chain>(chain: C, config: InternalSignerConfig<C>): Signer {
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
                return new SolanaExternalWalletSigner(config);
            }
            if (chain === "stellar") {
                return new StellarExternalWalletSigner(config);
            }
            return new EVMExternalWalletSigner(config);

        case "passkey":
            return new PasskeySigner(config);
    }
}
