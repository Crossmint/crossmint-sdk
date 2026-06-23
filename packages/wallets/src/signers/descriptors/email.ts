import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import { getSignerLocator } from "../../utils/signer-locator";
import type {
    EmailSignerConfig,
    InternalSignerConfig,
    RecoverySignerConfigForChain,
    SignerConfigForChain,
    SignerLocator,
} from "../types";
import type { SignerDescriptor, SignerDescriptorContext } from "./types";

export const emailSignerDescriptor: SignerDescriptor = {
    type: "email",
    validateConfig(config: SignerConfigForChain<Chain>): void {
        if (!("email" in config) || config.email == null) {
            throw new Error("Email signer requires an email address");
        }
    },
    buildInternalConfig(
        config: SignerConfigForChain<Chain>,
        ctx: SignerDescriptorContext<Chain>
    ): InternalSignerConfig<Chain> {
        const emailConfig = config as EmailSignerConfig;
        return {
            type: "email",
            email: emailConfig.email,
            locator: `email:${emailConfig.email}` as SignerLocator,
            address: ctx.walletAddress,
            crossmint: ctx.crossmint,
            clientTEEConnection: ctx.clientTEEConnection,
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
