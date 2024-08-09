import type { KernelSmartAccount } from "@zerodev/sdk";
import type { EntryPoint } from "permissionless/_types/types";
import type { HttpTransport } from "viem";

import { AdminMismatchError, SmartWalletError } from "../../error";
import { type SignerData, displayPasskey } from "../../types/API";
import { isEOAWalletParams, isPasskeyWalletParams } from "../../types/Config";
import { type AccountCreationParams, isEOACreationParams, isPasskeyCreationParams } from "../../types/internal";
import type { EOAAccountBuilder } from "./eoa";
import type { PasskeyAccountBuilder } from "./passkey";

export class AccountBuilder {
    constructor(private readonly eoa: EOAAccountBuilder, private readonly passkey: PasskeyAccountBuilder) {}

    public build(params: AccountCreationParams): Promise<{
        signerData: SignerData;
        account: KernelSmartAccount<EntryPoint, HttpTransport>;
    }> {
        this.assertValidParams(params);
        console.log("Here are the params from AccountBuilder");
        console.log(params);

        if (isPasskeyCreationParams(params)) {
            return this.passkey.build(params);
        }

        if (isEOACreationParams(params)) {
            return this.eoa.build(params);
        }

        throw new SmartWalletError("Invalid smart wallet creation parameters");
    }

    private assertValidParams(params: AccountCreationParams) {
        if (isPasskeyWalletParams(params.walletParams) && params.existingSignerConfig?.type === "eoa") {
            throw new AdminMismatchError(
                `Cannot create wallet with passkey signer for user '${params.user.id}', they have an existing wallet with eoa signer '${params.existingSignerConfig.eoaAddress}'.`,
                params.existingSignerConfig
            );
        }

        if (isEOAWalletParams(params.walletParams) && params.existingSignerConfig?.type === "passkeys") {
            throw new AdminMismatchError(
                `Cannot create wallet with eoa signer for user '${params.user.id}', they already have a wallet with a passkey named '${params.existingSignerConfig.passkeyName}' as its signer.`,
                displayPasskey(params.existingSignerConfig)
            );
        }
    }
}
