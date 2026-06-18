import type { RegisterSignerParams } from "../../api";
import type { Chain } from "../../chains/chains";
import type {
    ApiSourcedServerSignerConfig,
    InternalSignerConfig,
    PasskeySignerConfig,
    RecoverySignerConfigForChain,
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
    addSignerPayload(config: SignerConfigForChain<Chain>): RegisterSignerParams["signer"] {
        return config as RegisterSignerParams["signer"];
    },
    matchesRecovery(_config: SignerConfigForChain<Chain>, _recovery: RecoverySignerConfigForChain<Chain>): boolean {
        // Compare by type only: the api-sourced recovery config has {type:"passkey"} without a
        // credential id, so locator comparison ("passkey" vs "passkey:{id}") would fail. Type
        // already matches by the time this is called.
        return true;
    },
};
