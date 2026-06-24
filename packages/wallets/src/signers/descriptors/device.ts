import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import { getSignerLocator } from "../../utils/signer-locator";
import type {
    ApiSourcedServerSignerConfig,
    DeviceSignerConfig,
    InternalSignerConfig,
    SignerConfigForChain,
} from "../types";
import type { SignerDescriptor, SignerDescriptorContext } from "./types";

export const deviceSignerDescriptor: SignerDescriptor = {
    type: "device",
    validateConfig(_config: SignerConfigForChain<Chain>): void {},
    buildInternalConfig(
        config: SignerConfigForChain<Chain> | ApiSourcedServerSignerConfig,
        ctx: SignerDescriptorContext<Chain>
    ): InternalSignerConfig<Chain> {
        const locator = "locator" in config && config.locator ? config.locator : undefined;
        return {
            type: "device",
            locator,
            address: ctx.walletAddress,
        } as InternalSignerConfig<Chain>;
    },
    canAutoAssemble(
        _config: SignerConfigForChain<Chain> | ApiSourcedServerSignerConfig,
        ctx: SignerDescriptorContext<Chain>
    ): boolean {
        return ctx.deviceSignerKeyStorage != null;
    },
    addSignerPayload(config: SignerConfigForChain<Chain>): RegisterSignerParams["signer"] {
        if ("publicKey" in config && config.publicKey != null) {
            return {
                type: "device",
                publicKey: config.publicKey,
                name: (config as DeviceSignerConfig).name,
            } as RegisterSignerParams["signer"];
        }
        return getSignerLocator(config);
    },
    matchesRecovery(): boolean {
        return false;
    },
    adoptsRecoveryConfigOnMatch: true,
    signerUnavailableReason: () => null,
};
