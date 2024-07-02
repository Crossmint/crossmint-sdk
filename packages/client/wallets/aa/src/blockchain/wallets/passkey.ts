import {
    CURRENT_VERSION,
    CrossmintWalletService,
    EVMSmartWallet,
    EntryPointDetails,
    PasskeySigner,
    PasskeySignerData,
    UserParams,
    WalletConfig,
    ZERO_DEV_TYPE,
    blockchainToChainId,
} from "@/index";
import { WalletCreationParams } from "@/types/internal";
import { createPasskeyValidator, deserializePasskeyValidator } from "@zerodev/passkey-validator";
import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "@zerodev/passkey-validator/utils";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { EntryPoint } from "permissionless/types/entrypoint";
import { PublicClient } from "viem";

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

    public async getOrCreate({ user, chain, publicClient, walletConfig, entrypoint }: PasskeyWalletParams) {
        const validator = await this.getOrCreateSigner({
            user,
            entrypoint,
            publicClient,
            signer: walletConfig.signer,
        });

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: { sudo: validator },
            entryPoint: entrypoint.address,
        });

        await this.crossmintService.storeAbstractWallet(user, {
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
        user,
        entrypoint,
        publicClient,
        signer,
    }: {
        user: UserParams;
        entrypoint: EntryPointDetails;
        publicClient: PublicClient;
        signer: PasskeySigner;
    }): Promise<PasskeyValidator> {
        const serializedData = await this.fetchSerializedSigner(user);
        if (serializedData != null) {
            return deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: entrypoint.address,
            });
        }

        try {
            const test = await createPasskeyValidator(publicClient, {
                passkeyServerUrl: this.crossmintService.getPasskeyServerUrl(user),
                entryPoint: entrypoint.address,
                passkeyName: signer.passkeyName,
                credentials: "omit",
            });
            return test;
        } catch (e: any) {
            if (e.message.includes("The operation either timed out or was not allowed")) {
                throw new Error("Ahh caught you!");
            }
            console.log("Here's the error");
            console.log(e);
            throw e;
        }
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
