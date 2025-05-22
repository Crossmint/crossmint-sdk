import type { ApiClient, DelegatedSigner, SolanaWalletLocator } from "@/api";

import type { SolanaTransactionsService } from "./transactions-service";
import type { SolanaNonCustodialSigner } from "../types/signers";
import {
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
} from "../../../utils/errors";

export class SolanaDelegatedSignerService {
    constructor(
        private readonly walletLocator: SolanaWalletLocator,
        private readonly transactionsService: SolanaTransactionsService,
        private readonly apiClient: ApiClient
    ) {}

    public async registerDelegatedSigner(
        signer: string,
        adminSigner?: SolanaNonCustodialSigner
    ) {
        const response = (await this.apiClient.registerSigner(
            this.walletLocator,
            { signer }
        )) as Extract<
            Awaited<ReturnType<typeof this.apiClient.registerSigner>>,
            { transaction: { id: string } }
        >;

        const transactionId = response.transaction.id;
        await this.transactionsService.approveTransaction(
            transactionId,
            adminSigner ? [adminSigner] : []
        );
        await this.transactionsService.waitForTransaction(transactionId);
        return this.getDelegatedSigner(signer);
    }

    public async getDelegatedSigner(signer: string) {
        const response = await this.apiClient.getSigner(
            this.walletLocator,
            signer
        );
        return response;
    }

    public async getDelegatedSigners() {
        const walletResponse = await this.apiClient.getWallet(
            this.walletLocator
        );
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        if (walletResponse.type !== "solana-smart-wallet") {
            throw new WalletTypeNotSupportedError(
                `Wallet type ${walletResponse.type} not supported`
            );
        }
        const signers =
            (walletResponse.config
                ?.delegatedSigners as unknown as DelegatedSigner[]) ?? [];
        return signers;
    }
}
