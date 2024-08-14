import { AccountAndSigner, WalletCreationParams } from "../../../types/internal";

export interface AccountCreationStrategy {
    create(params: WalletCreationParams): Promise<AccountAndSigner>;
}
