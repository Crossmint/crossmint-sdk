import {
    CURRENT_VERSION,
    CrossmintWalletService,
    EVMSmartWallet,
    PasskeySigner,
    UserParams,
    ZERO_DEV_TYPE,
} from "@/index";
import {
    WebAuthnMode,
    deserializePasskeyValidator,
    toPasskeyValidator,
    toWebAuthnKey,
} from "@zerodev/passkey-validator";
import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "@zerodev/passkey-validator/utils";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V07, getEntryPointVersion } from "permissionless";
import { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/_types/types";
import { HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet, blockchainToChainId } from "@crossmint/common-sdk-base";

export default class PasskeyWalletService {
    private readonly entryPoint = ENTRYPOINT_ADDRESS_V07;

    constructor(private readonly crossmintService: CrossmintWalletService, private readonly apiKey: string) {}

    public async getOrCreate(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet,
        publicClient: PublicClient<HttpTransport>,
        signer: PasskeySigner
    ) {
        const serializedData = await this.get(user);
        let validator: KernelValidator<ENTRYPOINT_ADDRESS_V07_TYPE, "WebAuthnValidator"> & {
            getSerializedData: () => string;
        };
        if (serializedData != null) {
            validator = await deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: this.entryPoint,
            });
        } else {
            // TODO what if this path fails before we can store the wallet
            // we'll be left with a user that has already registered the passkey
            // put still ends up in this flow.

            const passkeyServerUrl = this.passkeyServerUrl(user);
            const webAuthnKey = await toWebAuthnKey({
                passkeyName: signer.passkeyName,
                mode: WebAuthnMode.Register,
                passkeyServerUrl,
            });

            validator = await toPasskeyValidator(publicClient, {
                webAuthnKey,
                passkeyServerUrl,
                entryPoint: ENTRYPOINT_ADDRESS_V07, // TEMP,
            });
        }

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: validator,
            },
            entryPoint: this.entryPoint,
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
                pubKeyX: validatorFields.pubKeyX.toString(),
                pubKeyY: validatorFields.pubKeyY.toString(),
                authenticatorIdHash: validatorFields.authenticatorIdHash,
                domain: this.getCurrentDomain(),
                type: "passkeys",
            },
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: getEntryPointVersion(ENTRYPOINT_ADDRESS_V07),
        });

        return new EVMSmartWallet(this.crossmintService, kernelAccount as any, publicClient, chain);
    }

    private async get(user: UserParams): Promise<string | null> {
        const signer = await this.crossmintService.getPasskeyValidatorSigner({ type: "whiteLabel", userId: user.id });
        return serializePasskeyValidatorData({
            passkeyServerUrl: signer.passkeyServerUrl,
            credentials: signer.credentials,
            entryPoint: signer.entryPoint,
            validatorAddress: signer.validatorAddress,
            pubKeyX: BigInt(signer.pubKeyX),
            pubKeyY: BigInt(signer.pubKeyY),
            authenticatorIdHash: signer.authenticatorIdHash,
        });
    }

    private passkeyServerUrl(user: UserParams): string {
        return this.crossmintService.crossmintBaseUrl + `/unstable/passkeys/${this.apiKey}/userId=${user.id}`;
    }

    private getCurrentDomain(): string {
        return window.location.hostname;
    }
}
