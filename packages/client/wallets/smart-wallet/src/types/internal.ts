import type { KernelSmartAccount } from "@zerodev/sdk";
import type { SmartAccountClient } from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import type { EntryPoint } from "permissionless/types/entrypoint";
import type { Address, Chain, HttpTransport, PublicClient } from "viem";

import type { SmartWalletChain } from "../blockchain/chains";
import type { EOASignerConfig, PasskeySignerConfig, SignerConfig } from "../blockchain/wallets/account/signer";
import { SUPPORTED_ENTRYPOINT_VERSIONS, SUPPORTED_KERNEL_VERSIONS } from "../utils/constants";
import type { EOASigner, PasskeySigner, UserParams, WalletParams } from "./params";

export type SupportedKernelVersion = (typeof SUPPORTED_KERNEL_VERSIONS)[number];
export function isSupportedKernelVersion(version: string): version is SupportedKernelVersion {
    return SUPPORTED_KERNEL_VERSIONS.includes(version as any);
}

export type SupportedEntryPointVersion = (typeof SUPPORTED_ENTRYPOINT_VERSIONS)[number];
export function isSupportedEntryPointVersion(version: string): version is SupportedEntryPointVersion {
    return SUPPORTED_ENTRYPOINT_VERSIONS.includes(version as any);
}

export interface WalletCreationParams {
    user: UserParams & { id: string };
    chain: SmartWalletChain;
    publicClient: PublicClient<HttpTransport>;
    walletParams: WalletParams;
    entryPoint: EntryPoint;
    kernelVersion: SupportedKernelVersion;
    existingSignerConfig?: SignerConfig;
}

export interface PasskeyCreationParams extends WalletCreationParams {
    walletParams: WalletParams & { signer: PasskeySigner };
    existingSignerConfig?: PasskeySignerConfig;
}

export interface EOACreationParams extends WalletCreationParams {
    walletParams: WalletParams & { signer: EOASigner };
    existingSignerConfig?: EOASignerConfig;
}

export function isPasskeyWalletParams(params: WalletParams): params is WalletParams & { signer: PasskeySigner } {
    return "signer" in params && "type" in params.signer && params.signer.type === "PASSKEY";
}

export function isPasskeyCreationParams(params: WalletCreationParams): params is PasskeyCreationParams {
    const signerIsPasskeyOrUndefined =
        params.existingSignerConfig == null || params.existingSignerConfig.type === "passkeys";

    return isPasskeyWalletParams(params.walletParams) && signerIsPasskeyOrUndefined;
}

export function isEOAWalletParams(params: WalletParams): params is WalletParams & { signer: EOASigner } {
    return (
        "signer" in params &&
        (("type" in params.signer && params.signer.type === "VIEM_ACCOUNT") ||
            ("request" in params.signer && typeof params.signer.request === "function"))
    );
}

export function isEOACreationParams(params: WalletCreationParams): params is EOACreationParams {
    const signerIsEOAOrUndefined = params.existingSignerConfig == null || params.existingSignerConfig.type === "eoa";

    return isEOAWalletParams(params.walletParams) && signerIsEOAOrUndefined;
}

export interface AccountAndSigner {
    account: KernelSmartAccount<EntryPoint, HttpTransport>;
    signerConfig: SignerConfig;
}

export type SmartWalletClient = SmartAccountClient<EntryPoint, HttpTransport, Chain, SmartAccount<EntryPoint>>;
