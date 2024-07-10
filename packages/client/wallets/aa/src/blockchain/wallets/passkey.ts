import { CrossmintWalletService } from "@/api/CrossmintWalletService";
import { PasskeySignerData } from "@/types/API";
import { PasskeySigner, UserParams, WalletConfig } from "@/types/Config";
import { WalletCreationParams } from "@/types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "@/utils/constants";
import {
    WebAuthnMode,
    deserializePasskeyValidator,
    toPasskeyValidator,
    toWebAuthnKey,
} from "@zerodev/passkey-validator";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { EntryPoint } from "permissionless/types/entrypoint";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "../../utils/passkey";
import { EVMSmartWallet } from "./EVMSmartWallet";

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

    public async getOrCreate({
        user,
        chain,
        publicClient,
        walletConfig,
        entrypoint,
        kernelVersion,
    }: PasskeyWalletParams) {
        const validator = await this.getOrCreateSigner({
            user,
            entrypoint,
            publicClient,
            walletConfig,
            kernelVersion,
            chain,
        });

        console.log("Here's the kernel version we're trying to re-construct the wallet from");
        console.log(kernelVersion);

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: { sudo: validator },
            entryPoint: entrypoint.address,
            kernelVersion,
        });

        await this.crossmintService.storeSmartWallet(user, {
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: kernelAccount.address,
            signerData: this.getSignerData(validator, walletConfig.signer.passkeyName),
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: entrypoint.version,
            kernelVersion,
        });

        return new EVMSmartWallet(this.crossmintService, kernelAccount, publicClient, chain);
    }

    private async getOrCreateSigner({
        user,
        entrypoint,
        publicClient,
        walletConfig,
        kernelVersion,
    }: PasskeyWalletParams): Promise<PasskeyValidator> {
        const serializedData = await this.fetchSerializedSigner(user);
        if (serializedData != null) {
            return deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: entrypoint.address,
                kernelVersion,
            });
        }

        return toPasskeyValidator(publicClient, {
            webAuthnKey: await toWebAuthnKey({
                passkeyName: walletConfig.signer.passkeyName,
                passkeyServerUrl: this.crossmintService.getPasskeyServerUrl(user),
                mode: WebAuthnMode.Register,
            }),
            entryPoint: entrypoint.address,
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

    private getSignerData(validator: PasskeyValidator, passkeyName: string): PasskeySignerData {
        const fields = deserializePasskeyValidatorData(validator.getSerializedData());
        return {
            ...fields,
            passkeyName,
            domain: window.location.hostname,
            type: "passkeys",
        };
    }
}
