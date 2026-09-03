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
import { passkeyCredentialId } from "../../utils/signer-locator";
import type { SignerDescriptor } from "./types";

export const passkeySignerDescriptor: SignerDescriptor = {
    type: "passkey",
    validateConfig(): void {},
    buildInternalConfig<C extends Chain>(
        config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig
    ): InternalSignerConfig<C> {
        const passkeyConfig = config as PasskeySignerConfig;
        const id = passkeyCredentialId(passkeyConfig) ?? "";
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
    matchesRecovery(config: SignerConfigForChain<Chain>, recovery: RecoverySignerConfigForChain<Chain>): boolean {
        // The api-sourced recovery config is often {type:"passkey"} without a credential id, in
        // which case type (already matched by the caller) is all there is to compare. When both
        // sides carry a credential id they must agree, so a supplied passkey does not match an
        // unrelated passkey recovery signer.
        const configId = passkeyCredentialId(config as PasskeySignerConfig);
        const recoveryId = passkeyCredentialId(recovery as PasskeySignerConfig);
        if (configId == null || recoveryId == null) {
            return true;
        }
        return configId === recoveryId;
    },
    adoptsRecoveryConfigOnMatch: false,
    signerUnavailableReason: () => null,
};
