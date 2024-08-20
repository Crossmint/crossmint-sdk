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

    public get(context: WalletCreationContext): Promise<AccountAndSigner> {
        if (isPasskeyCreationContext(context)) {
            return this.passkeyStrategy.create(context);
        }

        if (isEOACreationContext(context)) {
            return this.eoaStrategy.create(context);
        }

        if (context.existing == null) {
            throw new ConfigError(`Unsupported wallet params:\n${context.walletParams}`);
        }

        const display = context.existing.signerConfig.display();
        const inputSignerType = isPasskeyWalletParams(context.walletParams) ? "passkey" : "eoa";
        throw new AdminMismatchError(
            `Cannot create wallet with ${inputSignerType} signer for user ${
                context.user.id
            }', they already have a wallet with signer:\n'${JSON.stringify(display, null, 2)}'`,
            display
        );
    }
}
