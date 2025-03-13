import type { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { Connection } from "@solana/web3.js";

export const getConnectionFromEnvironment = (
    environment: APIKeyEnvironmentPrefix
) => {
    if (environment === "development" || environment === "staging") {
        return new Connection("https://api.devnet.solana.com");
    } else if (environment === "production") {
        return new Connection("https://api.mainnet-beta.solana.com");
    } else {
        throw new Error(`Invalid environment ${environment}`);
    }
};
