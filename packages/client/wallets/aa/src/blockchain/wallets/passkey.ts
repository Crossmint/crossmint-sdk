import { CrossmintWalletService, EVMAAWallet } from "@/index";
import { getIdString } from "@/utils/user";
import { createPasskeyValidator, deserializePasskeyValidator } from "@zerodev/passkey-validator";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/_types/types";
import { HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet, UserIdentifier } from "@crossmint/common-sdk-base";

export default class PasskeyWalletService {
    private readonly entryPoint = ENTRYPOINT_ADDRESS_V07;
    constructor(private readonly crossmintService: CrossmintWalletService, private readonly passkeyServerUrl: string) {}

    public async getOrCreate(
        userIdentifier: UserIdentifier,
        chain: EVMBlockchainIncludingTestnet,
        publicClient: PublicClient<HttpTransport>
    ) {
        const serializedData = await this.get(userIdentifier, chain);

        let validator: KernelValidator<ENTRYPOINT_ADDRESS_V07_TYPE, "WebAuthnValidator">;
        if (serializedData != null) {
            validator = await deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: this.entryPoint,
            });
        } else {
            validator = await createPasskeyValidator(publicClient, {
                passkeyServerUrl: this.passkeyServerUrl,
                entryPoint: this.entryPoint,
                passkeyName: getIdString(userIdentifier),
            });
        }

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: validator,
            },
            entryPoint: this.entryPoint,
        });

        // TODO save wallet to CM backend

        // TODO fix the init code type issue w/ kernel account & validator
        return new EVMAAWallet(kernelAccount as any, this.crossmintService, chain, publicClient, this.entryPoint);
    }

    // TODO fetch from DB
    // If there's an inconsistency, throw a nice error message.
    private async get(userIdentifier: UserIdentifier, chain: EVMBlockchainIncludingTestnet): Promise<string | null> {
        return "eyJwYXNza2V5U2VydmVyVXJsIjoiaHR0cHM6Ly9wYXNza2V5cy56ZXJvZGV2LmFwcC9hcGkvdjMvMTc0M2M5ZTQtYzQxYS00MTg4LTgyN2YtNTQ3MzAxYWExNjQ1IiwiY3JlZGVudGlhbHMiOiJpbmNsdWRlIiwiZW50cnlQb2ludCI6IjB4MDAwMDAwMDA3MTcyN0RlMjJFNUU5ZDhCQWYwZWRBYzZmMzdkYTAzMiIsInZhbGlkYXRvckFkZHJlc3MiOiIweEQ5OTAzOTNDNjcwZENjRThiNGQ4Rjg1OEZCOThjOTkxMmRCRkFhMDYiLCJwdWJLZXlYIjoiYjgxYzNiNWUxMjQ2MWY5Mzk4MTAzYWI5MTk5ZWRjYzgyMThjNzdmYWFkMDYwNGZhYmI5NGM1MzVkMTdjOGQ3MyIsInB1YktleVkiOiIyZDZmYmU4MGRlYjI3MzgzNDllNDY3MWI2ZTYwZmM2M2Q3NmEwOTczMjJmYTQwYzdiNTRiNDg3NTZmMjJmYjM3IiwiYXV0aGVudGljYXRvcklkSGFzaCI6IjB4MGY0NzIwYzdlMmI3NWEwODYxMGJkN2E1ZmMxZDEwMDlmZDJhZGYyZTc3ZTdmNTViOGMzNzcxZDQ1Njc5Mjg3OCJ9";
    }
}
