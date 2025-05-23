import { EmailSigner } from "./email";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";
import { EVMExternalWalletSigner } from "./evm-external-wallet";
import { PasskeySigner } from "./passkey";
import { EVMApiKeySigner } from "./evm-api-key";
import { SolanaApiKeySigner } from "./solana-api-key";

import type { Chain } from "../chains/chains";
import type { Signer, SignerConfigForChain } from "./types";

export function createSigner<C extends Chain>(
    chain: C,
    raw: SignerConfigForChain<C> | { type: "api-key-legacy"; address: string }
): Signer {
    switch (raw.type) {
        case "email":
            return new EmailSigner(raw);

        case "api-key-legacy":
            return chain === "solana" ? new SolanaApiKeySigner(raw.address) : new EVMApiKeySigner(raw.address);

        case "external-wallet":
            return chain === "solana" ? new SolanaExternalWalletSigner(raw) : new EVMExternalWalletSigner(raw);

        case "passkey":
            return new PasskeySigner(raw);

        default:
            throw new Error(`Unsupported signer type: ${(raw as any).type}`);
    }
}
