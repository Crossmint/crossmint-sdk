import { Hex, HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { EntryPointDetails, UserParams, WalletConfig } from "./Config";

export const SUPPORTED_KERNEL_VERSIONS = ["0.3.1", "0.3.0"] as const;
export type SupportedKernelVersion = (typeof SUPPORTED_KERNEL_VERSIONS)[number];

export const SUPPORTED_ENTRYPOINT_VERSIONS = ["v0.6", "v0.7"] as const;
export type SupportedEntrypointVersion = (typeof SUPPORTED_ENTRYPOINT_VERSIONS)[number];

export interface WalletCreationParams {
    user: UserParams;
    chain: EVMBlockchainIncludingTestnet;
    publicClient: PublicClient<HttpTransport>;
    walletConfig: WalletConfig;
    entrypoint: EntryPointDetails;
    kernelVersion: SupportedKernelVersion;
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
