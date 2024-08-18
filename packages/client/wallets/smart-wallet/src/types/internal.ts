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

export interface PreExistingWalletProperties {
    signerConfig: SignerConfig;
    address: Address;
}

export interface WalletCreationContext {
    user: UserParams & { id: string };
    chain: SmartWalletChain;
    publicClient: PublicClient<HttpTransport>;
    walletParams: WalletParams;
    entryPoint: EntryPoint;
    kernelVersion: SupportedKernelVersion;
    existing?: PreExistingWalletProperties;
}

export interface PasskeyCreationContext extends WalletCreationContext {
    walletParams: WalletParams & { signer: PasskeySigner };
    existing?: { signerConfig: PasskeySignerConfig; address: Address };
}

export interface EOACreationContext extends WalletCreationContext {
    walletParams: WalletParams & { signer: EOASigner };
    existing?: { signerConfig: EOASignerConfig; address: Address };
}

export function isPasskeyWalletParams(params: WalletParams): params is WalletParams & { signer: PasskeySigner } {
    return "signer" in params && "type" in params.signer && params.signer.type === "PASSKEY";
}

export function isPasskeyCreationContext(params: WalletCreationContext): params is PasskeyCreationContext {
    const signerIsPasskeyOrUndefined = params.existing == null || params.existing.signerConfig.type === "passkeys";

    return isPasskeyWalletParams(params.walletParams) && signerIsPasskeyOrUndefined;
}

export function isEOAWalletParams(params: WalletParams): params is WalletParams & { signer: EOASigner } {
    return (
        "signer" in params &&
        (("type" in params.signer && params.signer.type === "VIEM_ACCOUNT") ||
            ("request" in params.signer && typeof params.signer.request === "function"))
    );
}

export function isEOACreationContext(params: WalletCreationContext): params is EOACreationContext {
    const signerIsEOAOrUndefined = params.existing == null || params.existing.signerConfig.type === "eoa";

    return isEOAWalletParams(params.walletParams) && signerIsEOAOrUndefined;
}

export interface AccountAndSigner {
    account: KernelSmartAccount<EntryPoint, HttpTransport>;
    signerConfig: SignerConfig;
}

export type SmartWalletClient = SmartAccountClient<EntryPoint, HttpTransport, Chain, SmartAccount<EntryPoint>>;
