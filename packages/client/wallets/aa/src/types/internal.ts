import { Hex, HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { EntryPointDetails, UserParams, WalletConfig } from "./Config";

export interface WalletCreationParams {
    user: UserParams;
    chain: EVMBlockchainIncludingTestnet;
    publicClient: PublicClient<HttpTransport>;
    walletConfig: WalletConfig;
    entrypoint: EntryPointDetails;
}

export type PasskeyValidatorSerializedData = {
    passkeyServerUrl: string;
    credentials: string;
    entryPoint: Hex;
    validatorAddress: Hex;
    pubKeyX: string;
    pubKeyY: string;
    authenticatorIdHash: Hex;
};
