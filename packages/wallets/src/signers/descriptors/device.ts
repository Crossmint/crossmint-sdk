import type { Chain } from "../../chains/chains";
import type { ApiSourcedServerSignerConfig, InternalSignerConfig, SignerConfigForChain } from "../types";
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
};
