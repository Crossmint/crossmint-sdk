import {
    CURRENT_VERSION,
    CrossmintWalletService,
    EVMSmartWallet,
    EntryPointDetails,
    PasskeySigner,
    UserParams,
    ZERO_DEV_TYPE,
} from "@/index";
import { createPasskeyValidator, deserializePasskeyValidator } from "@zerodev/passkey-validator";
import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "@zerodev/passkey-validator/utils";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { EntryPoint } from "permissionless/types/entrypoint";
import { Address, Hex, HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet, blockchainToChainId } from "@crossmint/common-sdk-base";

export default class PasskeyWalletService {
    constructor(private readonly crossmintService: CrossmintWalletService, private readonly apiKey: string) {}

    public async getOrCreate({
        user,
        chain,
        publicClient,
        signer,
        entrypoint,
    }: {
        user: UserParams;
        chain: EVMBlockchainIncludingTestnet;
        publicClient: PublicClient<HttpTransport>;
        signer: PasskeySigner;
        entrypoint: EntryPointDetails;
    }) {
        const serializedData = await this.get(user);
        let validator: KernelValidator<EntryPoint, "WebAuthnValidator"> & {
            getSerializedData: () => string;
        };

        if (serializedData != null) {
            validator = await deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: entrypoint.address,
            });
        } else {
            validator = await createPasskeyValidator(publicClient, {
                passkeyServerUrl: this.passkeyServerUrl(user),
                entryPoint: entrypoint.address,
                passkeyName: user.id,
                credentials: "omit",
            });
        }

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: validator,
            },
            entryPoint: entrypoint.address,
        });
        const validatorFields = deserializePasskeyValidatorData(validator.getSerializedData());

        await this.crossmintService.storeAbstractWallet({
            userIdentifier: { type: "whiteLabel", userId: user.id },
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: kernelAccount.address,
            signerData: {
                passkeyName: signer.passkeyName,
                passkeyServerUrl: validatorFields.passkeyServerUrl,
                credentials: validatorFields.credentials,
                entryPoint: validatorFields.entryPoint,
                validatorAddress: validatorFields.validatorAddress,
                pubKeyX: validatorFields.pubKeyX,
                pubKeyY: validatorFields.pubKeyY,
                authenticatorIdHash: validatorFields.authenticatorIdHash,
                domain: this.getCurrentDomain(),
                type: "passkeys",
            },
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: entrypoint.version,
        });
        return new EVMSmartWallet(this.crossmintService, kernelAccount as any, publicClient, chain);
    }

    private async get(user: UserParams): Promise<string | null> {
        const signer = await this.crossmintService.getPasskeyValidatorSigner({ type: "whiteLabel", userId: user.id });

        if (signer == null) {
            return null;
        }

        if (signer.type !== "passkeys") {
            throw new Error("TBD what to do here");
        }

        return serializePasskeyValidatorData({
            passkeyServerUrl: signer.passkeyServerUrl,
            credentials: signer.credentials,
            entryPoint: signer.entryPoint as Address,
            validatorAddress: signer.validatorAddress as Address,
            pubKeyX: signer.pubKeyX,
            pubKeyY: signer.pubKeyY,
            authenticatorIdHash: signer.authenticatorIdHash as Hex,
        });
    }

    private passkeyServerUrl(user: UserParams): string {
        return this.crossmintService.crossmintBaseUrl + `/unstable/passkeys/${this.apiKey}/userId=${user.id}`;
    }

    private getCurrentDomain(): string {
        return window.location.hostname;
    }
}
