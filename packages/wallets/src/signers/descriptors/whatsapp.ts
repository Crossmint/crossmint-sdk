import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import { getSignerLocator } from "../../utils/signer-locator";
import type {
    InternalSignerConfig,
    SignerConfigForChain,
    RecoverySignerConfigForChain,
    SignerLocator,
    WhatsappSignerConfig,
} from "../types";
import type { SignerDescriptor, SignerDescriptorContext } from "./types";

export const whatsappSignerDescriptor: SignerDescriptor = {
    type: "whatsapp",
    validateConfig(config: SignerConfigForChain<Chain>): void {
        if (!("phone" in config) || config.phone == null) {
            throw new Error("Whatsapp signer requires a phone number");
        }
    },
    buildInternalConfig(
        config: SignerConfigForChain<Chain>,
        ctx: SignerDescriptorContext<Chain>
    ): InternalSignerConfig<Chain> {
        const whatsappConfig = config as WhatsappSignerConfig;
        return {
            type: "whatsapp",
            phone: whatsappConfig.phone,
            locator: `whatsapp:${whatsappConfig.phone}` as SignerLocator,
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
