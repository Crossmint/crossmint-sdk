import type { CrossmintWalletService } from "@/api/CrossmintWalletService";
import { type PasskeySignerData, displayPasskey } from "@/types/API";
import type { PasskeySigner, UserParams, WalletParams } from "@/types/Config";
import type { AccountAndSigner, PasskeyValidatorSerializedData, WalletCreationParams } from "@/types/internal";
import { PasskeyValidatorContractVersion, WebAuthnMode, toPasskeyValidator } from "@zerodev/passkey-validator";
import { type KernelSmartAccount, type KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { WebAuthnKey, toWebAuthnKey } from "@zerodev/webauthn-key";
import type { EntryPoint } from "permissionless/types/entrypoint";

import { PasskeyMismatchError, PasskeyPromptError, PasskeyRegistrationError } from "../../error";

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

        try {
            const passkey = await this.getPasskey(user, inputPasskeyName, existingSignerConfig);

            const latestValidatorVersion = PasskeyValidatorContractVersion.V0_0_2;
            const validatorContractVersion =
                existingSignerConfig == null ? latestValidatorVersion : existingSignerConfig.validatorContractVersion;
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
                signerData: this.getSignerData(validator, validatorContractVersion, inputPasskeyName),
                account: this.decorate(kernelAccount, inputPasskeyName),
            };
        } catch (error) {
            throw this.mapError(error, inputPasskeyName);
        }
    }

    private async getPasskey(
        user: UserParams,
        passkeyName: string,
        existing?: PasskeySignerData
    ): Promise<WebAuthnKey> {
        if (existing != null) {
            return {
                pubX: BigInt(existing.pubKeyX),
                pubY: BigInt(existing.pubKeyY),
                authenticatorId: existing.authenticatorId,
                authenticatorIdHash: existing.authenticatorIdHash,
            };
        }

        return toWebAuthnKey({
            passkeyName,
            passkeyServerUrl: this.crossmintService.getPasskeyServerUrl(),
            mode: WebAuthnMode.Register,
            passkeyServerHeaders: this.createPasskeysServerHeaders(user),
        });
    }

    private getSignerData(
        validator: PasskeyValidator,
        validatorContractVersion: PasskeyValidatorContractVersion,
        passkeyName: string
    ): PasskeySignerData {
        return {
            ...deserializePasskeyValidatorData(validator.getSerializedData()),
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

    private mapError(error: any, passkeyName: string) {
        if (error.message === "Registration not verified") {
            return new PasskeyRegistrationError(passkeyName);
        }

        if (error.code === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" && error.name === "NotAllowedError") {
            return new PasskeyPromptError(passkeyName);
        }

        return error;
    }

    private decorate<Client extends KernelSmartAccount<EntryPoint>>(account: Client, passkeyName: string): Client {
        return new Proxy(account, {
            get: (target, prop, receiver) => {
                if (prop !== "signUserOperation") {
                    return Reflect.get(target, prop, receiver);
                }

                return async (...args: Parameters<Client["signUserOperation"]>) => {
                    try {
                        return await Reflect.get(target, prop, receiver).call(target, ...args);
                    } catch (error) {
                        throw this.mapError(error, passkeyName);
                    }
                };
            },
        });
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
