import { CURRENT_VERSION, CrossmintWalletService, EVMAAWallet, PasskeyWalletConfig, ZERO_DEV_TYPE } from "@/index";
import { getIdString } from "@/utils/user";
import { createPasskeyValidator, deserializePasskeyValidator } from "@zerodev/passkey-validator";
import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "@zerodev/passkey-validator/utils";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V07, getEntryPointVersion } from "permissionless";
import { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/_types/types";
import { HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet, UserIdentifier, blockchainToChainId } from "@crossmint/common-sdk-base";

export default class PasskeyWalletService {
    private readonly entryPoint = ENTRYPOINT_ADDRESS_V07;

    constructor(private readonly crossmintService: CrossmintWalletService, private readonly projectId: string) {}

    public async getOrCreate(
        userIdentifier: UserIdentifier,
        chain: EVMBlockchainIncludingTestnet,
        publicClient: PublicClient<HttpTransport>,
        walletConfig?: PasskeyWalletConfig // TODO, should we let devs override the name? Or add special validation?
    ) {
        const serializedData = await this.get(userIdentifier, chain);

        let validator: KernelValidator<ENTRYPOINT_ADDRESS_V07_TYPE, "WebAuthnValidator"> & {
            getSerializedData: () => string;
        };
        if (serializedData != null) {
            validator = await deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: this.entryPoint,
            });
        } else {
            validator = await createPasskeyValidator(publicClient, {
                passkeyServerUrl: this.passkeyServerUrl(userIdentifier),
                entryPoint: this.entryPoint,
                passkeyName: getIdString(userIdentifier),
                credentials: "omit",
            });
        }

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: validator,
            },
            entryPoint: this.entryPoint,
        });

        const abstractAddress = kernelAccount.address;
        const { sessionKeySignerAddress } = await this.crossmintService.createSessionKey(abstractAddress);
        // evmAAWallet.setSessionKeySignerAddress(sessionKeySignerAddress);

        const validatorFields = deserializePasskeyValidatorData(validator.getSerializedData());
        await this.crossmintService.storeAbstractWallet({
            userIdentifier,
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: abstractAddress,
            signerData: {
                passkeyName: "TODO passkeyName",
                passkeyServerUrl: validatorFields.passkeyServerUrl,
                credentials: validatorFields.credentials,
                entryPoint: validatorFields.entryPoint,
                validatorAddress: validatorFields.validatorAddress,
                pubKeyX: validatorFields.pubKeyX,
                pubKeyY: validatorFields.pubKeyY,
                authenticatorIdHash: validatorFields.authenticatorIdHash,
                domain: "TODO domain",
                type: "passkeys",
            },
            sessionKeySignerAddress,
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: getEntryPointVersion(this.entryPoint),
        });
        // TODO fix the init code type issue w/ kernel account & validator
        return new EVMAAWallet(kernelAccount as any, this.crossmintService, chain, publicClient, this.entryPoint);
    }

    // TODO fetch from DB
    // If there's an inconsistency, throw a nice error message.
    private async get(userIdentifier: UserIdentifier, chain: EVMBlockchainIncludingTestnet): Promise<string | null> {
        const signer = await this.crossmintService.getPasskeyValidatorSigner(userIdentifier);
        return serializePasskeyValidatorData({
            passkeyServerUrl: signer.passkeyServerUrl,
            credentials: signer.credentials,
            entryPoint: signer.entryPoint,
            validatorAddress: signer.validatorAddress,
            pubKeyX: signer.pubKeyX,
            pubKeyY: signer.pubKeyY,
            authenticatorIdHash: signer.authenticatorIdHash,
        });

        // return "eyJwYXNza2V5U2VydmVyVXJsIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwL2FwaS91bnN0YWJsZS9wYXNza2V5cy80NGI2ZjFlOS1kMjE4LTQ1MTAtYTAzMi1hZGU4YmEwOTM4ZGEvdXNlcklkPWRldmx5bi10ZXN0aW5nLTM0NSIsImNyZWRlbnRpYWxzIjoib21pdCIsImVudHJ5UG9pbnQiOiIweDAwMDAwMDAwNzE3MjdEZTIyRTVFOWQ4QkFmMGVkQWM2ZjM3ZGEwMzIiLCJ2YWxpZGF0b3JBZGRyZXNzIjoiMHhEOTkwMzkzQzY3MGRDY0U4YjRkOEY4NThGQjk4Yzk5MTJkQkZBYTA2IiwicHViS2V5WCI6ImJmYTU3YjhiNzFiNTQ2NDQxOGQ1YmVkMTk2ZjczYmUxM2Q3YWE5MDFlYTFiMTM0ZTJlMzQyNTRjOWIyNzkzM2YiLCJwdWJLZXlZIjoiMGI5OGU0YmRmZmVkZjIyZjE4NTUxNTA1MTEwMGFkNTE2MzE0YzI5NDZkN2M2OGNiZjU2ZTcyN2ZlYjU0ZWVhZCIsImF1dGhlbnRpY2F0b3JJZEhhc2giOiIweGMwOGY0NjBhNTFlN2NlZmVlOTBkYTAwNmZmZWRlNjgwNzEyOThiZDQwNGU0YTQyOThkNTJhNTU3Zjg0OTM0ZWEifQ==";
        // return null;
        // return "eyJwYXNza2V5U2VydmVyVXJsIjoiaHR0cHM6Ly9wYXNza2V5cy56ZXJvZGV2LmFwcC9hcGkvdjMvMTc0M2M5ZTQtYzQxYS00MTg4LTgyN2YtNTQ3MzAxYWExNjQ1IiwiY3JlZGVudGlhbHMiOiJpbmNsdWRlIiwiZW50cnlQb2ludCI6IjB4MDAwMDAwMDA3MTcyN0RlMjJFNUU5ZDhCQWYwZWRBYzZmMzdkYTAzMiIsInZhbGlkYXRvckFkZHJlc3MiOiIweEQ5OTAzOTNDNjcwZENjRThiNGQ4Rjg1OEZCOThjOTkxMmRCRkFhMDYiLCJwdWJLZXlYIjoiYjgxYzNiNWUxMjQ2MWY5Mzk4MTAzYWI5MTk5ZWRjYzgyMThjNzdmYWFkMDYwNGZhYmI5NGM1MzVkMTdjOGQ3MyIsInB1YktleVkiOiIyZDZmYmU4MGRlYjI3MzgzNDllNDY3MWI2ZTYwZmM2M2Q3NmEwOTczMjJmYTQwYzdiNTRiNDg3NTZmMjJmYjM3IiwiYXV0aGVudGljYXRvcklkSGFzaCI6IjB4MGY0NzIwYzdlMmI3NWEwODYxMGJkN2E1ZmMxZDEwMDlmZDJhZGYyZTc3ZTdmNTViOGMzNzcxZDQ1Njc5Mjg3OCJ9";
    }

    private passkeyServerUrl(userIdentifier: UserIdentifier): string {
        let identifier: string;
        switch (userIdentifier.type) {
            case "email":
                identifier = `email=${encodeURIComponent(userIdentifier.email)}`;
                break;
            case "whiteLabel":
                identifier = `userId=${userIdentifier.userId}`;
                break;
            case "phoneNumber":
                identifier = `phoneNumber=${encodeURIComponent(userIdentifier.phoneNumber)}`; // TODO will this work?
                break;
            default:
                throw new Error("Unsupported identifier type");
        }

        return this.crossmintService.crossmintBaseUrl + `/unstable/passkeys/${this.projectId}/${identifier}`;
    }
}
