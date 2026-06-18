import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { Crossmint } from "@crossmint/common-sdk-base";
import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import type { DeviceSignerKeyStorage } from "../../utils/device-signers/DeviceSignerKeyStorage";
import type { Callbacks } from "../../wallets/types";
import type { ServerSignerResolver } from "../server/resolver";
import type {
    ApiSourcedServerSignerConfig,
    InternalSignerConfig,
    RecoverySignerConfigForChain,
    SignerConfigForChain,
} from "../types";

export interface SignerDescriptorContext<C extends Chain> {
    chain: C;
    walletAddress: string;
    crossmint: Crossmint;
    clientTEEConnection?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    onAuthRequired?: Callbacks["onAuthRequired"];
    deviceSignerKeyStorage?: DeviceSignerKeyStorage;
    serverSigners: ServerSignerResolver;
}

export interface SignerDescriptor<C extends Chain = Chain> {
    readonly type: "email" | "phone" | "passkey" | "device" | "api-key" | "server" | "external-wallet";
    validateConfig(config: SignerConfigForChain<C>): void;
    buildInternalConfig(
        config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig,
        ctx: SignerDescriptorContext<C>
    ): InternalSignerConfig<C>;
    canAutoAssemble(
        config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig,
        ctx: SignerDescriptorContext<C>
    ): boolean;
    addSignerPayload(config: SignerConfigForChain<C>, ctx: SignerDescriptorContext<C>): RegisterSignerParams["signer"];
    matchesRecovery(
        config: SignerConfigForChain<C>,
        recovery: RecoverySignerConfigForChain<C>,
        ctx: SignerDescriptorContext<C>
    ): boolean;
}
