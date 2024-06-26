import {
    CURRENT_VERSION,
    CrossmintWalletService,
    EVMSmartWallet,
    EntryPointDetails,
    PasskeySigner,
    PasskeySignerData,
    UserIdentifier,
    WalletConfig,
    ZERO_DEV_TYPE,
} from "@/index";
import { WalletCreationParams } from "@/types/internal";
import { createPasskeyValidator, deserializePasskeyValidator } from "@zerodev/passkey-validator";
import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "@zerodev/passkey-validator/utils";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { EntryPoint } from "permissionless/types/entrypoint";
import { PublicClient } from "viem";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

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

    public async getOrCreate({ userIdentifier, chain, publicClient, walletConfig, entrypoint }: PasskeyWalletParams) {
        const validator = await this.getOrCreateSigner({
            userIdentifier,
            entrypoint,
            publicClient,
            signer: walletConfig.signer,
        });
        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: { sudo: validator },
            entryPoint: entrypoint.address,
        });

        await this.crossmintService.storeAbstractWallet({
            userIdentifier,
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: kernelAccount.address,
            signerData: this.getSignerData(validator, walletConfig.signer.passkeyName),
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: entrypoint.version,
        });

        return new EVMSmartWallet(this.crossmintService, kernelAccount, publicClient, chain);
    }

    private async getOrCreateSigner({
        userIdentifier,
        entrypoint,
        publicClient,
        signer,
    }: {
        userIdentifier: UserIdentifier;
        entrypoint: EntryPointDetails;
        publicClient: PublicClient;
        signer: PasskeySigner;
    }): Promise<PasskeyValidator> {
        const serializedData = await this.fetchSerializedSigner(userIdentifier);
        if (serializedData != null) {
            return deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: entrypoint.address,
            });
        }

        return createPasskeyValidator(publicClient, {
            passkeyServerUrl: this.crossmintService.getPasskeyServerUrl(userIdentifier),
            entryPoint: entrypoint.address,
            passkeyName: signer.passkeyName,
            credentials: "omit",
        });
    }

    private async fetchSerializedSigner(user: UserIdentifier): Promise<string | null> {
        const signer = await this.crossmintService.getPasskeyValidatorSigner(user);
        if (signer == null) {
            return null;
        }

        if (signer.type !== "passkeys") {
            throw new Error("Admin Mismatch"); // TODO custom error as defined within SDK spec
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
