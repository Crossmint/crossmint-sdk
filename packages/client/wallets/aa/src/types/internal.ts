import { HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { EntryPointDetails, UserIdentifier, WalletConfig } from "./Config";

export interface WalletCreationParams {
    userIdentifier: UserIdentifier;
    chain: EVMBlockchainIncludingTestnet;
    publicClient: PublicClient<HttpTransport>;
    walletConfig: WalletConfig;
    entrypoint: EntryPointDetails;
}
