import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import { getSignerLocator } from "../../utils/signer-locator";
import type {
    InternalSignerConfig,
    PhoneSignerConfig,
    RecoverySignerConfigForChain,
    SignerConfigForChain,
    SignerLocator,
} from "../types";
import type { SignerDescriptor, SignerDescriptorContext } from "./types";

export const phoneSignerDescriptor: SignerDescriptor = {
    type: "phone",
    validateConfig(config: SignerConfigForChain<Chain>): void {
        if (!("phone" in config) || config.phone == null) {
            throw new Error("Phone signer requires a phone number");
        }
    },
    buildInternalConfig(
        config: SignerConfigForChain<Chain>,
        ctx: SignerDescriptorContext<Chain>
    ): InternalSignerConfig<Chain> {
        const phoneConfig = config as PhoneSignerConfig;
        return {
            type: "phone",
            phone: phoneConfig.phone,
            locator: `phone:${phoneConfig.phone}` as SignerLocator,
            address: ctx.walletAddress,
            crossmint: ctx.crossmint,
            clientTEEConnection: ctx.clientTEEConnection,
            resetSignerFrame: ctx.resetSignerFrame,
            onAuthRequired: ctx.onAuthRequired,
        } as InternalSignerConfig<Chain>;
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
    adoptsRecoveryConfigOnMatch: true,
    signerUnavailableReason: () => null,
};
