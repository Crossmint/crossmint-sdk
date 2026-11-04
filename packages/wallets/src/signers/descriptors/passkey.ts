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
import { createPasskeyCredential } from "../passkey-credential";
import type { SignerDescriptor, SignerDescriptorContext } from "./types";

export const passkeySignerDescriptor: SignerDescriptor = {
    type: "passkey",
    validateConfig(): void {},
    buildInternalConfig<C extends Chain>(
        config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig,
        ctx: SignerDescriptorContext<C>
    ): InternalSignerConfig<C> {
        const passkeyConfig = config as PasskeySignerConfig;
        const id = passkeyCredentialId(passkeyConfig) ?? "";
        return {
            type: "passkey",
            id,
            locator: `passkey:${id}` as SignerLocator,
            name: "name" in passkeyConfig ? passkeyConfig.name : undefined,
            publicKey: passkeyConfig.publicKey,
            onCreatePasskey: passkeyConfig.onCreatePasskey ?? ctx.passkeyProvider?.createPasskey,
            onSignWithPasskey: passkeyConfig.onSignWithPasskey ?? ctx.passkeyProvider?.signWithPasskey,
        } as InternalSignerConfig<C>;
    },
    canAutoAssemble(): boolean {
        return true;
    },
    async prepareRegistration<C extends Chain>(
        config: SignerConfigForChain<C>,
        ctx: SignerDescriptorContext<C>
    ): Promise<SignerConfigForChain<C>> {
        const passkeyConfig = config as PasskeySignerConfig;
        if (passkeyCredentialId(passkeyConfig) != null) {
            return config;
        }
        // Keep the caller's callbacks (onSignWithPasskey) on the returned config.
        const created = await createPasskeyCredential(passkeyConfig, ctx.passkeyProvider);
        return { ...passkeyConfig, ...created } as SignerConfigForChain<C>;
    },
    addSignerPayload(config: SignerConfigForChain<Chain>): RegisterSignerParams["signer"] {
        const passkeyConfig = config as PasskeySignerConfig;
        const id = passkeyCredentialId(passkeyConfig);
        if (id == null || passkeyConfig.publicKey == null) {
            // Not registrable: the API needs the credential id and public key. Sent as given so the API reports it.
            return config as RegisterSignerParams["signer"];
        }
        // Only the fields of the API's passkey signer: no callbacks or locator in the request body.
        return {
            type: "passkey",
            id,
            ...(passkeyConfig.name != null && { name: passkeyConfig.name }),
            publicKey: passkeyConfig.publicKey,
        } as RegisterSignerParams["signer"];
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
