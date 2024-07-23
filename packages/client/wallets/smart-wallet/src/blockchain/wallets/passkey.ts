import type { CrossmintWalletService } from "@/api/CrossmintWalletService";
import { PasskeyPromptError, SmartWalletSDKError } from "@/error";
import type { PasskeySignerData } from "@/types/API";
import type { PasskeySigner, UserParams, WalletConfig } from "@/types/Config";
import type { AccountAndSigner, WalletCreationParams } from "@/types/internal";
import { WebAuthnError } from "@simplewebauthn/browser";
import { WebAuthnMode, deserializePasskeyValidator, toPasskeyValidator } from "@zerodev/passkey-validator";
import { KernelSmartAccount, type KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { toWebAuthnKey } from "@zerodev/webauthn-key";
import type { EntryPoint } from "permissionless/types/entrypoint";

import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "../../utils/passkey";

export interface PasskeyWalletParams extends WalletCreationParams {
    walletConfig: WalletConfig & { signer: PasskeySigner };
}

export function isPasskeyParams(params: WalletCreationParams): params is PasskeyWalletParams {
    return (params.walletConfig.signer as PasskeySigner).type === "PASSKEY";
}

type PasskeyValidator = KernelValidator<EntryPoint, "WebAuthnValidator"> & {
    getSerializedData: () => string;
};

export class PasskeyWalletService {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async getAccount({
        user,
        publicClient,
        walletConfig,
        entryPoint,
        kernelVersion,
    }: PasskeyWalletParams): Promise<AccountAndSigner> {
        try {
            const validator = await this.getValidator({
                user,
                entryPoint,
                publicClient,
                walletConfig,
                kernelVersion,
            });

            const kernelAccount = await createKernelAccount(publicClient, {
                plugins: { sudo: validator },
                entryPoint: entryPoint.address,
                kernelVersion,
            });

            return {
                signerData: this.getSignerData(validator, walletConfig.signer.passkeyName),
                account: this.decorateAccount(kernelAccount, walletConfig.signer),
            };
        } catch (error) {
            throw this.mapError(error, walletConfig.signer);
        }
    }

    private async getValidator({
        user,
        entryPoint,
        publicClient,
        walletConfig,
        kernelVersion,
    }: Omit<PasskeyWalletParams, "chain">): Promise<PasskeyValidator> {
        const serializedData = await this.fetchSerializedSigner(user);
        if (serializedData != null) {
            return deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: entryPoint.address,
                kernelVersion,
            });
        }

        const webAuthnKey = await toWebAuthnKey({
            passkeyName: walletConfig.signer.passkeyName ?? "",
            passkeyServerUrl: this.crossmintService.getPasskeyServerUrl(),
            mode: WebAuthnMode.Register,
            passkeyServerHeaders: this.createPasskeysServerHeaders(user),
        });

        return toPasskeyValidator(publicClient, {
            webAuthnKey,
            entryPoint: entryPoint.address,
            kernelVersion,
        });
    }

    private async fetchSerializedSigner(user: UserParams): Promise<string | null> {
        const signer = await this.crossmintService.getPasskeySigner(user);
        if (signer == null) {
            return null;
        }

        return serializePasskeyValidatorData(signer);
    }

    private getSignerData(validator: PasskeyValidator, passkeyName: string = ""): PasskeySignerData {
        const fields = deserializePasskeyValidatorData(validator.getSerializedData());
        return {
            ...fields,
            passkeyName,
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

    private mapError(error: unknown, config: PasskeySigner) {
        if ((error as WebAuthnError).name === "NotAllowedError") {
            return new PasskeyPromptError(config.passkeyName);
        }

        return error;
    }

    private decorateAccount<Client extends KernelSmartAccount<EntryPoint>>(
        account: Client,
        config: PasskeySigner
    ): Client {
        return new Proxy(account, {
            get: (target, prop, receiver) => {
                if (prop !== "signUserOperation") {
                    return Reflect.get(target, prop, receiver);
                }

                return async (...args: Parameters<Client["signUserOperation"]>) => {
                    try {
                        return await Reflect.get(target, prop, receiver).call(target, ...args);
                    } catch (error) {
                        throw this.mapError(error, config);
                    }
                };
            },
        });
    }
}
