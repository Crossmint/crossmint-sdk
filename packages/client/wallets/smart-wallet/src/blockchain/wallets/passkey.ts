import { CrossmintWalletService } from "@/api/CrossmintWalletService";
import { PasskeySignerData } from "@/types/API";
import { PasskeySigner, UserParams, WalletParams } from "@/types/Config";
import { AccountAndSigner, WalletCreationParams } from "@/types/internal";
import { WebAuthnMode, deserializePasskeyValidator, toPasskeyValidator } from "@zerodev/passkey-validator";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { toWebAuthnKey } from "@zerodev/webauthn-key";
import { EntryPoint } from "permissionless/types/entrypoint";

import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "../../utils/passkey";

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
        if (
            existingSignerConfig != null &&
            walletParams.signer.passkeyName != null &&
            existingSignerConfig.passkeyName !== walletParams.signer.passkeyName
        ) {
            throw new Error("Ahhh");
        }

        const validator = await this.getValidator(
            {
                user,
                entryPoint,
                publicClient,
                walletParams,
                kernelVersion,
            },
            existingSignerConfig
        );

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: { sudo: validator },
            entryPoint: entryPoint.address,
            kernelVersion,
        });

        return { signerData: this.getSignerData(validator, walletParams.signer.passkeyName), account: kernelAccount };
    }

    private async getValidator(
        { user, entryPoint, publicClient, walletParams, kernelVersion }: Omit<PasskeyWalletParams, "chain">,
        existingSignerConfig?: PasskeySignerData
    ): Promise<PasskeyValidator> {
        if (existingSignerConfig != null) {
            return await deserializePasskeyValidator(publicClient, {
                serializedData: serializePasskeyValidatorData(existingSignerConfig),
                entryPoint: entryPoint.address,
                kernelVersion,
            });
        }

        const webAuthnKey = await toWebAuthnKey({
            passkeyName: walletParams.signer.passkeyName ?? "",
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
}
