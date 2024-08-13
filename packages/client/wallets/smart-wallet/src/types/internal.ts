import type { EOASignerConfig, PasskeySignerConfig, SignerConfig } from "@/blockchain/wallets/account/signer";
import type { KernelSmartAccount } from "@zerodev/sdk";
import type { SmartAccountClient } from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import type { EntryPoint } from "permissionless/types/entrypoint";
import type { Chain, HttpTransport, PublicClient } from "viem";

import type { SmartWalletChain } from "../blockchain/chains";
import type { EOASigner, PasskeySigner, UserParams, WalletParams } from "./params";

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
    entryPoint: { version: SupportedEntryPointVersion; address: EntryPoint };
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

export function isPasskeyCreationParams(params: WalletCreationParams): params is PasskeyCreationParams {
    const hasPasskeyWalletParams =
        "signer" in params.walletParams &&
        "type" in params.walletParams.signer &&
        params.walletParams.signer.type === "PASSKEY";

    const signerIsPasskeyOrUndefined =
        params.existingSignerConfig == null || params.existingSignerConfig.type === "passkeys";

    return hasPasskeyWalletParams && signerIsPasskeyOrUndefined;
}

export function isEOACreationParams(params: WalletCreationParams): params is EOACreationParams {
    const hasEOAWalletParams =
        "signer" in params.walletParams &&
        (("type" in params.walletParams.signer && params.walletParams.signer.type === "VIEM_ACCOUNT") ||
            ("request" in params.walletParams.signer && typeof params.walletParams.signer.request === "function"));

    const signerIsEOAOrUndefined = params.existingSignerConfig == null || params.existingSignerConfig.type === "eoa";

    return hasEOAWalletParams && signerIsEOAOrUndefined;
}

export interface AccountAndSigner {
    account: KernelSmartAccount<EntryPoint, HttpTransport>;
    signerConfig: SignerConfig;
}

export type SmartWalletClient = SmartAccountClient<EntryPoint, HttpTransport, Chain, SmartAccount<EntryPoint>>;
