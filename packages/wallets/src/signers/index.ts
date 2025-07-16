import { EVMNonCustodialSigner, SolanaNonCustodialSigner } from "./non-custodial";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";
import { EVMExternalWalletSigner } from "./evm-external-wallet";
import { PasskeySigner } from "./passkey";
import { EVMApiKeySigner } from "./evm-api-key";
import { SolanaApiKeySigner } from "./solana-api-key";
import type { Chain } from "../chains/chains";
import type { InternalSignerConfig, Signer } from "./types";

export function assembleSigner<C extends Chain>(chain: C, config: InternalSignerConfig<C>): Signer {
    switch (config.type) {
        case "email":
        case "phone":
            return chain === "solana" ? new SolanaNonCustodialSigner(config) : new EVMNonCustodialSigner(config);
        case "api-key":
            return chain === "solana" ? new SolanaApiKeySigner(config) : new EVMApiKeySigner(config);

        case "external-wallet":
            return chain === "solana" ? new SolanaExternalWalletSigner(config) : new EVMExternalWalletSigner(config);

        case "passkey":
            return new PasskeySigner(config);
    }
}
