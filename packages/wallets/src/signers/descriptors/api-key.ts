import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import { getSignerLocator } from "../../utils/signer-locator";
import type {
    ApiSourcedServerSignerConfig,
    InternalSignerConfig,
    RecoverySignerConfigForChain,
    SignerConfigForChain,
    SignerLocator,
} from "../types";
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
    addSignerPayload(config: SignerConfigForChain<Chain>): RegisterSignerParams["signer"] {
        return getSignerLocator(config);
    },
    matchesRecovery(config: SignerConfigForChain<Chain>, recovery: RecoverySignerConfigForChain<Chain>): boolean {
        return getSignerLocator(config) === getSignerLocator(recovery as SignerConfigForChain<Chain>);
    },
};
