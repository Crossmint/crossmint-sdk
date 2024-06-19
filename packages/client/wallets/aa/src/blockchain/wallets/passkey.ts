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

// TODO JWT validation.
// TODO: Errors according to spec.
// TODO: ZeroDev SDK pull from sessionStorage. sessionStorage.getItem("userId")
// We'd like a user to be able to login through any means, and not need to sign two passkey prompts:
// - One to login and re-instantiate the wallet
// - The other to sign the actual transaction
// TODO: Remove debug logs

export default class PasskeyWalletService {
    // TODO should we keep apikey here? or should the passkey server be a separate service maybe that extends the base crossmint service?
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
        console.debug(`getOrCreate called with user: ${user.id}, chain: ${chain}, signer: ${signer.passkeyName}`);

        const serializedData = await this.get(user);
        console.debug(`Serialized data for user ${user.id}: ${serializedData}`);

        let validator: KernelValidator<EntryPoint, "WebAuthnValidator"> & {
            getSerializedData: () => string;
        };

        if (serializedData != null) {
            console.debug(`Deserializing passkey validator for user ${user.id}`);
            validator = await deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: entrypoint.address,
            });
        } else {
            console.debug(`No serialized data found for user ${user.id}, creating new passkey validator`);
            // TODO what if this path fails before we can store the wallet
            // we'll be left with a user that has already registered the passkey
            // put still ends up in this flow.

            const passkeyServerUrl = this.passkeyServerUrl(user);
            console.debug(`Passkey server URL for user ${user.id}: ${passkeyServerUrl}`);

            validator = await createPasskeyValidator(publicClient, {
                passkeyServerUrl: this.passkeyServerUrl(user),
                entryPoint: entrypoint.address,
                passkeyName: user.id,
                credentials: "omit",
            });

            // const validator = getPasskeyValidator(publicClient, {
            //     passkeyServerUrl: this.passkeyServerUrl(user),
            //     entryPoint: this.entryPoint,
            //     credentials: "omit",
            // });

            console.debug(`Passkey validator created for user ${user.id}`);
        }

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: validator,
            },
            entryPoint: entrypoint.address,
        });
        console.debug(`Kernel account created for user ${user.id} with address ${kernelAccount.address}`);

        const validatorFields = deserializePasskeyValidatorData(validator.getSerializedData());
        console.debug(`Validator fields deserialized for user ${user.id}`);

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
        console.debug(`Abstract wallet stored for user ${user.id}`);

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
