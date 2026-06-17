import type { Chain } from "../../chains/chains";
import {
    type ApiSourcedServerSignerConfig,
    type InternalSignerConfig,
    isApiSourcedServerSignerConfig,
    type ServerSignerConfig,
    type ServerSignerLocator,
    type SignerConfigForChain,
} from "../types";
import type { SignerDescriptor, SignerDescriptorContext } from "./types";

export const serverSignerDescriptor: SignerDescriptor = {
    type: "server",

    validateConfig() {},

    buildInternalConfig<C extends Chain>(
        config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig,
        ctx: SignerDescriptorContext<C>
    ): InternalSignerConfig<C> {
        const { derivedKeyBytes, derivedAddress } = ctx.serverSigners.keyMaterialForAssembly(
            config as ServerSignerConfig | ApiSourcedServerSignerConfig
        );
        return {
            type: "server",
            derivedKeyBytes,
            locator: `server:${derivedAddress}` as ServerSignerLocator,
            address: derivedAddress,
        } as InternalSignerConfig<C>;
    },

    canAutoAssemble<C extends Chain>(
        config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig,
        ctx: SignerDescriptorContext<C>
    ): boolean {
        return !isApiSourcedServerSignerConfig(config) || ctx.serverSigners.hasRecoveryResolution;
    },
};
