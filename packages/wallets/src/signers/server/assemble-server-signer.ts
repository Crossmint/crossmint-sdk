import type { Chain } from "../../chains/chains";
import type { SignerAdapter, ServerInternalSignerConfig } from "../types";
import { getChainType } from "./helpers";
import { EVMServerSigner } from "./evm-server-signer";
import { SolanaServerSigner } from "./solana-server-signer";
import { StellarServerSigner } from "./stellar-server-signer";

export function assembleServerSigner(chain: Chain, config: ServerInternalSignerConfig): SignerAdapter<"server"> {
    const chainType = getChainType(chain);
    switch (chainType) {
        case "evm":
            return new EVMServerSigner(config);
        case "solana":
            return new SolanaServerSigner(config);
        case "stellar":
            return new StellarServerSigner(config);
    }
}
