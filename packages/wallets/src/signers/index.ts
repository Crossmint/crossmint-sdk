import { EmailSigner } from "./email";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";
import { EVMExternalWalletSigner } from "./evm-external-wallet";
import { PasskeySigner } from "./passkey";
import { ApiKeySigner } from "./api-key";

import { Chain } from "../chains/chains";
import { Signer, SignerConfigForChain } from "./types";

export function createSigner<C extends Chain>(
    chain: C,
    raw: SignerConfigForChain<C>
): Signer {
    switch (raw.type) {
        case "email":
            return new EmailSigner(raw);

        case "api-key":
            return new ApiKeySigner();

        case "external-wallet":
            if (chain === "solana") {
                return new SolanaExternalWalletSigner(raw);
            }
            return new EVMExternalWalletSigner(raw);
        case "passkey":
            return new PasskeySigner(raw);

        default:
            throw new Error(`Unsupported signer type: ${(raw as any).type}`);
    }
}
