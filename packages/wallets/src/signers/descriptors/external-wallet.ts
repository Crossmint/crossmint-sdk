import type { Chain } from "../../chains/chains";
import type {
    ApiSourcedServerSignerConfig,
    ExternalWalletSignerConfigForChain,
    InternalSignerConfig,
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

    buildInternalConfig(config: SignerConfigForChain<Chain> | ApiSourcedServerSignerConfig): InternalSignerConfig<Chain> {
        const externalWalletConfig = config as ExternalWalletSignerConfigForChain<Chain>;
        return {
            ...externalWalletConfig,
            locator: `external-wallet:${externalWalletConfig.address}` as SignerLocator,
        } as InternalSignerConfig<Chain>;
    },

    canAutoAssemble(config: SignerConfigForChain<Chain> | ApiSourcedServerSignerConfig): boolean {
        return "onSign" in config && typeof config.onSign === "function";
    },
};
