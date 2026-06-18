import type { Chain } from "../../chains/chains";
import type { ApiSourcedServerSignerConfig, InternalSignerConfig, SignerConfigForChain, SignerLocator } from "../types";
import type { SignerDescriptor, SignerDescriptorContext } from "./types";

export const apiKeySignerDescriptor: SignerDescriptor = {
    type: "api-key",
    validateConfig(): void {},
    buildInternalConfig<C extends Chain>(
        _config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig,
        ctx: SignerDescriptorContext<C>
    ): InternalSignerConfig<C> {
        return {
            type: "api-key",
            locator: "api-key" as SignerLocator,
            address: ctx.walletAddress,
        } as InternalSignerConfig<C>;
    },
    canAutoAssemble(): boolean {
        return true;
    },
};
