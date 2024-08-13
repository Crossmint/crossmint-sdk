import { AdminMismatchError, ConfigError } from "../../../error";
import {
    AccountAndSigner,
    type WalletCreationParams,
    isEOACreationParams,
    isPasskeyCreationParams,
} from "../../../types/internal";
import { EOAAccountService } from "../eoa";
import { PasskeyAccountService } from "../passkey";

export class AccountCreator {
    constructor(private readonly eoa: EOAAccountService, private readonly passkey: PasskeyAccountService) {}

    public get(params: WalletCreationParams): Promise<AccountAndSigner> {
        if (isPasskeyCreationParams(params)) {
            return this.passkey.get(params);
        }

        if (isEOACreationParams(params)) {
            return this.eoa.get(params);
        }

        if (params.existingSignerConfig == null) {
            throw new ConfigError("Unsupported signer type");
        }

        const signerDisplay = params.existingSignerConfig.display();
        throw new AdminMismatchError(
            `Cannot create wallet with ${params.existingSignerConfig.type} signer for user ${params.user.id}', they already have a wallet with signer:\n'${signerDisplay}'`,
            signerDisplay
        );
    }
}
