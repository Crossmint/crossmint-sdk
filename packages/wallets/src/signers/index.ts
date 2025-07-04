import { EvmEmailSigner, SolanaEmailSigner, StellarEmailSigner } from "./email";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";
import { EVMExternalWalletSigner } from "./evm-external-wallet";
import { PasskeySigner } from "./passkey";
import { EVMApiKeySigner } from "./evm-api-key";
import { SolanaApiKeySigner } from "./solana-api-key";
import type { Chain } from "../chains/chains";
import type { InternalSignerConfig, Signer, SolanaExternalWalletSignerConfig } from "./types";

export function assembleSigner<C extends Chain>(chain: C, config: InternalSignerConfig<C>): Signer {
    switch (config.type) {
        case "email":
            if (chain === "solana") return new SolanaEmailSigner(config);
            if (chain === "stellar") return new StellarEmailSigner(config);
            return new EvmEmailSigner(config);

        case "api-key":
            return chain === "solana" ? new SolanaApiKeySigner(config) : new EVMApiKeySigner(config);

        case "external-wallet":
            return chain === "solana"
                ? new SolanaExternalWalletSigner(config as SolanaExternalWalletSignerConfig)
                : new EVMExternalWalletSigner(config);

        case "passkey":
            return new PasskeySigner(config);
    }
}
