import type { Chain } from "../../chains/chains";
import type {
    ApiSourcedServerSignerConfig,
    InternalSignerConfig,
    PasskeySignerConfig,
    SignerConfigForChain,
    SignerLocator,
} from "../types";
import type { SignerDescriptor } from "./types";

export const passkeySignerDescriptor: SignerDescriptor = {
    type: "passkey",
    validateConfig(): void {},
    buildInternalConfig<C extends Chain>(
        config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig
    ): InternalSignerConfig<C> {
        const passkeyConfig = config as PasskeySignerConfig;
        const id = "id" in passkeyConfig && passkeyConfig.id ? passkeyConfig.id : "";
        return {
            type: "passkey",
            id,
            locator: `passkey:${id}` as SignerLocator,
            name: "name" in passkeyConfig ? passkeyConfig.name : undefined,
            publicKey: "publicKey" in passkeyConfig ? passkeyConfig.publicKey : undefined,
            onCreatePasskey: passkeyConfig.onCreatePasskey,
            onSignWithPasskey: passkeyConfig.onSignWithPasskey,
        } as InternalSignerConfig<C>;
    },
    canAutoAssemble(): boolean {
        return true;
    },
};
