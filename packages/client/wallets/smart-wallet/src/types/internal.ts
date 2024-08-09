import type { KernelSmartAccount } from "@zerodev/sdk";
import type { SmartAccountClient } from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import type { EntryPoint } from "permissionless/types/entrypoint";
import type { Address, Chain, Hex, HttpTransport, PublicClient } from "viem";

import type { SmartWalletChain } from "../blockchain/chains";
import type { EOASignerData, PasskeySignerData, SignerData } from "./API";
import type { EOASigner, EntryPointDetails, PasskeySigner, UserParams, WalletParams } from "./Config";

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

export interface AccountCreationParams {
    user: UserParams & { id: string };
    chain: SmartWalletChain;
    publicClient: PublicClient<HttpTransport>;
    walletParams: WalletParams;
    entryPoint: EntryPointDetails;
    kernelVersion: SupportedKernelVersion;
    smartContractWalletAddress?: Address;
    existingSignerConfig?: SignerData;
}

export interface PasskeyCreationParams extends AccountCreationParams {
    walletParams: WalletParams & { signer: PasskeySigner };
    existingSignerConfig?: PasskeySignerData;
}

export interface EOACreationParams extends AccountCreationParams {
    walletParams: WalletParams & { signer: EOASigner };
    existingSignerConfig?: EOASignerData;
}

export function isPasskeyCreationParams(params: AccountCreationParams): params is PasskeyCreationParams {
    return (
        "signer" in params.walletParams &&
        "type" in params.walletParams.signer &&
        params.walletParams.signer.type === "PASSKEY" &&
        (!params.existingSignerConfig || "passkeyName" in params.existingSignerConfig)
    );
}

export function isEOACreationParams(params: AccountCreationParams): params is EOACreationParams {
    return (
        "signer" in params.walletParams &&
        ("type" in params.walletParams.signer ? params.walletParams.signer.type === "VIEM_ACCOUNT" : true) &&
        (!params.existingSignerConfig || "eoaAddress" in params.existingSignerConfig)
    );
}

export interface AccountConfig {
    entryPointVersion: SupportedEntryPointVersion;
    kernelVersion: SupportedKernelVersion;
    userId: string;
    existingSignerConfig?: SignerData;
    smartContractWalletAddress?: Address;
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
