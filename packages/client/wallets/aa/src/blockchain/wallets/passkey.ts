import { CrossmintWalletService, EVMAAWallet } from "@/index";
import { getIdString } from "@/utils/user";
import { createPasskeyValidator } from "@zerodev/passkey-validator";
import { createKernelAccount } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet, UserIdentifier } from "@crossmint/common-sdk-base";

export default class PasskeyWalletService {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async getOrCreate(
        userIdentifier: UserIdentifier,
        chain: EVMBlockchainIncludingTestnet,
        publicClient: PublicClient<HttpTransport>
    ) {
        // TODO
        // Fetch wallet for userIdentifier
        // If there's an inconsistency, throw an error
        // If there's a wallet, deserialize the validator and pass it back.

        const entryPoint = ENTRYPOINT_ADDRESS_V07;
        const validator = await createPasskeyValidator(publicClient, {
            passkeyServerUrl: "X",
            entryPoint,
            passkeyName: getIdString(userIdentifier),
        });
        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: validator,
            },
            entryPoint,
        });

        // TODO save wallet to CM backend

        // TODO fix the init code type issue w/ kernel account & validator
        return new EVMAAWallet(kernelAccount as any, this.crossmintService, chain, publicClient, entryPoint);
    }
}
