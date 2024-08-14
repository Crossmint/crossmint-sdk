import { AdminMismatchError, ConfigError } from "../../../error";
import {
    AccountAndSigner,
    type WalletCreationParams,
    isEOACreationParams,
    isPasskeyCreationParams,
} from "../../../types/internal";
import { EOACreationStrategy } from "./eoa";
import { PasskeyCreationStrategy } from "./passkey";

export class AccountCreator {
    constructor(
        private readonly eoaStrategy: EOACreationStrategy,
        private readonly passkeyStrategy: PasskeyCreationStrategy
    ) {}

    public get(params: WalletCreationParams): Promise<AccountAndSigner> {
        if (isPasskeyCreationParams(params)) {
            return this.passkeyStrategy.create(params);
        }

        if (isEOACreationParams(params)) {
            return this.eoaStrategy.create(params);
        }

        if (params.existingSignerConfig == null) {
            throw new ConfigError(`Unsupported wallet params:\n${params.walletParams}`);
        }

        const signerDisplay = params.existingSignerConfig.display();
        throw new AdminMismatchError(
            `Cannot create wallet with ${params.existingSignerConfig.type} signer for user ${params.user.id}', they already have a wallet with signer:\n'${signerDisplay}'`,
            signerDisplay
        );
    }
}
