import type { CrossmintWalletService } from "@/api/CrossmintWalletService";
import { type PasskeySignerData, displayPasskey } from "@/types/API";
import type { PasskeySigner, UserParams, WalletParams } from "@/types/Config";
import type { AccountAndSigner, PasskeyValidatorSerializedData, WalletCreationParams } from "@/types/internal";
import { PasskeyValidatorContractVersion, WebAuthnMode, toPasskeyValidator } from "@zerodev/passkey-validator";
import { type KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { WebAuthnKey, toWebAuthnKey } from "@zerodev/webauthn-key";
import type { EntryPoint } from "permissionless/types/entrypoint";

import { PasskeyMismatchError } from "../../error";

export interface PasskeyWalletParams extends WalletCreationParams {
    walletParams: WalletParams & { signer: PasskeySigner };
}

export function isPasskeyParams(params: WalletCreationParams): params is PasskeyWalletParams {
    return (params.walletParams.signer as PasskeySigner).type === "PASSKEY";
}

type PasskeyValidator = KernelValidator<EntryPoint, "WebAuthnValidator"> & {
    getSerializedData: () => string;
};

export class PasskeyAccountService {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async get(
        { user, publicClient, walletParams, entryPoint, kernelVersion }: PasskeyWalletParams,
        existingSignerConfig?: PasskeySignerData
    ): Promise<AccountAndSigner> {
        const inputPasskeyName = walletParams.signer.passkeyName ?? user.id;
        if (existingSignerConfig != null && existingSignerConfig.passkeyName !== inputPasskeyName) {
            throw new PasskeyMismatchError(
                `User '${user.id}' has an existing wallet created with a passkey named '${existingSignerConfig.passkeyName}', this does match input passkey name '${inputPasskeyName}'.`,
                displayPasskey(existingSignerConfig)
            );
        }

        const latestValidatorVersion = PasskeyValidatorContractVersion.V0_0_2;
        const validatorContractVersion =
            existingSignerConfig == null ? latestValidatorVersion : existingSignerConfig.validatorContractVersion;

        const passkey = await this.getPasskey({
            user,
            passkeyName: walletParams.signer.passkeyName,
            existing: existingSignerConfig,
        });
        const validator = await toPasskeyValidator(publicClient, {
            webAuthnKey: passkey,
            entryPoint: entryPoint.address,
            validatorContractVersion,
            kernelVersion,
        });

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: { sudo: validator },
            entryPoint: entryPoint.address,
            kernelVersion,
        });

        return {
            signerData: this.getSignerData(validator, validatorContractVersion, walletParams.signer.passkeyName),
            account: kernelAccount,
        };
    }

    private async getPasskey({
        user,
        passkeyName,
        existing,
    }: {
        user: UserParams;
        passkeyName?: string;
        existing?: PasskeySignerData;
    }): Promise<WebAuthnKey> {
        if (existing != null) {
            return {
                pubX: BigInt(existing.pubKeyX),
                pubY: BigInt(existing.pubKeyY),
                authenticatorId: existing.authenticatorId,
                authenticatorIdHash: existing.authenticatorIdHash,
            };
        }

        return toWebAuthnKey({
            passkeyName: passkeyName ?? "",
            passkeyServerUrl: this.crossmintService.getPasskeyServerUrl(),
            mode: WebAuthnMode.Register,
            passkeyServerHeaders: this.createPasskeysServerHeaders(user),
        });
    }

    private getSignerData(
        validator: PasskeyValidator,
        validatorContractVersion: PasskeyValidatorContractVersion,
        passkeyName: string = ""
    ): PasskeySignerData {
        const fields = deserializePasskeyValidatorData(validator.getSerializedData());

        return {
            ...fields,
            passkeyName,
            validatorContractVersion,
            domain: window.location.hostname,
            type: "passkeys",
        };
    }

    private createPasskeysServerHeaders(user: UserParams) {
        return {
            "x-api-key": this.crossmintService.crossmintAPIHeaders["x-api-key"],
            Authorization: `Bearer ${user.jwt}`,
        };
    }
}

const deserializePasskeyValidatorData = (params: string) => {
    const uint8Array = base64ToBytes(params);
    const jsonString = new TextDecoder().decode(uint8Array);

    return JSON.parse(jsonString) as PasskeyValidatorSerializedData;
};

function base64ToBytes(base64: string) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
}
