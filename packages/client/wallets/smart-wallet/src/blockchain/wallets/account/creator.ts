import { AdminMismatchError, ConfigError } from "../../../error";
import {
    type AccountAndSigner,
    type WalletCreationContext,
    isEOACreationContext,
    isPasskeyCreationContext,
    isPasskeyWalletParams,
} from "../../../types/internal";
import { EOACreationStrategy } from "./eoa";
import { PasskeyCreationStrategy } from "./passkey";

export class AccountCreator {
    constructor(
        private readonly eoaStrategy: EOACreationStrategy,
        private readonly passkeyStrategy: PasskeyCreationStrategy
    ) {}

    public get(params: WalletCreationContext): Promise<AccountAndSigner> {
        if (isPasskeyCreationContext(params)) {
            return this.passkeyStrategy.create(params);
        }

        if (isEOACreationContext(params)) {
            return this.eoaStrategy.create(params);
        }

        if (params.existing == null) {
            throw new ConfigError(`Unsupported wallet params:\n${params.walletParams}`);
        }

        const display = params.existing.signerConfig.display();
        const inputSignerType = isPasskeyWalletParams(params.walletParams) ? "passkey" : "eoa";
        throw new AdminMismatchError(
            `Cannot create wallet with ${inputSignerType} signer for user ${
                params.user.id
            }', they already have a wallet with signer:\n'${JSON.stringify(display, null, 2)}'`,
            display
        );
    }
}
