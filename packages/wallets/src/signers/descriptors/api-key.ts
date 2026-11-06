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
    adoptsRecoveryConfigOnMatch: false,
    signerUnavailableReason: () => null,
};

/**
 * The `api-key:<address>` locator of an api-key recovery method, as the API returns it on the wallet's
 * recovery config, or null when the config carries neither the locator nor the address.
 * Transactions still use the bare `"api-key"` locator; only the recovery-methods API needs this one.
 */
export function qualifiedApiKeyLocator(recovery: object): SignerLocator | null {
    const { locator, address } = recovery as { locator?: unknown; address?: unknown };
    if (typeof locator === "string" && locator.startsWith("api-key:")) {
        return locator as SignerLocator;
    }
    if (typeof address === "string" && address !== "") {
        return `api-key:${address}`;
    }
    return null;
}
