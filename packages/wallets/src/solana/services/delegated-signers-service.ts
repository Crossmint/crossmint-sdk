import type { ApiClient, SolanaWalletLocator } from "@/api";

import type { SolanaTransactionsService } from "./transactions-service";
import type { SolanaNonCustodialSigner } from "../types/signers";

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

    // biome-ignore lint/suspicious/useAwait: <explanation>
    public async removeDelegatedSigner(_address: string): Promise<void> {
        throw new Error("Not implemented");
    }
}
