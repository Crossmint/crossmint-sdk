import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import { getSignerLocator } from "../../utils/signer-locator";
import type {
    ApiSourcedServerSignerConfig,
    ExternalWalletSignerConfigForChain,
    InternalSignerConfig,
    RecoverySignerConfigForChain,
    SignerConfigForChain,
    SignerLocator,
} from "../types";
import type { SignerDescriptor } from "./types";

export const externalWalletSignerDescriptor: SignerDescriptor = {
    type: "external-wallet",

    validateConfig(config: SignerConfigForChain<Chain>): void {
        if (!("address" in config) || config.address == null) {
            throw new Error("External wallet signer requires a wallet address");
        }
        if (!("onSign" in config) || typeof config.onSign !== "function") {
            throw new Error("External wallet signer requires an onSign callback");
        }
    },

    buildInternalConfig(
        config: SignerConfigForChain<Chain> | ApiSourcedServerSignerConfig
    ): InternalSignerConfig<Chain> {
        const externalWalletConfig = config as ExternalWalletSignerConfigForChain<Chain>;
        return {
            ...externalWalletConfig,
            locator: `external-wallet:${externalWalletConfig.address}` as SignerLocator,
        } as InternalSignerConfig<Chain>;
    },

    canAutoAssemble(config: SignerConfigForChain<Chain> | ApiSourcedServerSignerConfig): boolean {
        return "onSign" in config && typeof config.onSign === "function";
    },

    addSignerPayload(config: SignerConfigForChain<Chain>): RegisterSignerParams["signer"] {
        return getSignerLocator(config);
    },

    matchesRecovery(config: SignerConfigForChain<Chain>, recovery: RecoverySignerConfigForChain<Chain>): boolean {
        return getSignerLocator(config) === getSignerLocator(recovery as SignerConfigForChain<Chain>);
    },
};
