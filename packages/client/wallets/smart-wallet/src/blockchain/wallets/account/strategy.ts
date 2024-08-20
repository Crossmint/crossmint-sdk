import { AccountAndSigner, WalletCreationContext } from "../../../types/internal";

export interface AccountCreationStrategy {
    create(params: WalletCreationContext): Promise<AccountAndSigner>;
}
