import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import {
    type ApiSourcedServerSignerConfig,
    type InternalSignerConfig,
    isApiSourcedServerSignerConfig,
    type RecoverySignerConfigForChain,
    type ServerSignerConfig,
    type ServerSignerLocator,
    type SignerConfigForChain,
} from "../types";
import type { SignerDescriptor, SignerDescriptorContext } from "./types";

const SERVER_SIGNER_UNAVAILABLE_MESSAGE =
    "No signer is set. Server wallets require calling wallet.useSigner() with the server secret before signing operations.\n" +
    'Example: wallet.useSigner({ type: "server", secret: process.env.YOUR_SERVER_SECRET })';

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

    addSignerPayload<C extends Chain>(
        config: SignerConfigForChain<C>,
        ctx: SignerDescriptorContext<C>
    ): RegisterSignerParams["signer"] {
        return ctx.serverSigners.apiLocator(config as ServerSignerConfig);
    },

    matchesRecovery<C extends Chain>(
        config: SignerConfigForChain<C>,
        recovery: RecoverySignerConfigForChain<C>,
        ctx: SignerDescriptorContext<C>
    ): boolean {
        const a = ctx.serverSigners.candidateAddresses(config as ServerSignerConfig);
        const b = ctx.serverSigners.candidateAddresses(recovery as ServerSignerConfig | ApiSourcedServerSignerConfig);
        return a.some((x) => b.includes(x));
    },
    adoptsRecoveryConfigOnMatch: true,
    signerUnavailableReason: () => SERVER_SIGNER_UNAVAILABLE_MESSAGE,
};
