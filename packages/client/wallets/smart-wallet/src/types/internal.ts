import type { KernelSmartAccount } from "@zerodev/sdk";
import type { SmartAccountClient } from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import type { EntryPoint } from "permissionless/types/entrypoint";
import type { Chain, Hex, HttpTransport, PublicClient } from "viem";

import type { SmartWalletChain } from "../blockchain/chains";
import type { SignerData } from "./API";
import type { EntryPointDetails, UserParams, WalletParams } from "./Config";

export const SUPPORTED_KERNEL_VERSIONS = ["0.3.1", "0.3.0", "0.2.4"] as const;
export type SupportedKernelVersion = (typeof SUPPORTED_KERNEL_VERSIONS)[number];

export function isSupportedKernelVersion(version: string): version is SupportedKernelVersion {
    return SUPPORTED_KERNEL_VERSIONS.includes(version as any);
}

export const SUPPORTED_ENTRYPOINT_VERSIONS = ["v0.6", "v0.7"] as const;
export type SupportedEntryPointVersion = (typeof SUPPORTED_ENTRYPOINT_VERSIONS)[number];

export function isSupportedEntryPointVersion(version: string): version is SupportedEntryPointVersion {
    return SUPPORTED_ENTRYPOINT_VERSIONS.includes(version as any);
}

export interface WalletCreationParams {
    user: UserParams & { id: string };
    chain: SmartWalletChain;
    publicClient: PublicClient<HttpTransport>;
    walletParams: WalletParams;
    entryPoint: EntryPointDetails;
    kernelVersion: SupportedKernelVersion;
}

export interface AccountAndSigner {
    account: KernelSmartAccount<EntryPoint, HttpTransport>;
    signerData: SignerData;
}

export type PasskeyValidatorSerializedData = {
    passkeyServerUrl: string;
    entryPoint: Hex;
    validatorAddress: Hex;
    pubKeyX: string;
    pubKeyY: string;
    authenticatorIdHash: Hex;
    authenticatorId: string;
};

export type SmartWalletClient = SmartAccountClient<EntryPoint, HttpTransport, Chain, SmartAccount<EntryPoint>>;
