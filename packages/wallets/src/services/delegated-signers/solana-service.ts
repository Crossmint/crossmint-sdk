import { BaseDelegatedSignerService } from "./base-service";
import type { ApiClient, DelegatedSigner } from "../../api";
import type { SolanaTransactionsService } from "../transactions/solana-service";
import type { SolanaChain } from "../../types";

export class SolanaDelegatedSignerService extends BaseDelegatedSignerService {
    protected readonly transactionsService: SolanaTransactionsService;

    constructor(apiClient: ApiClient, walletLocator: string, transactionsService: SolanaTransactionsService) {
        super(apiClient, walletLocator);
        this.transactionsService = transactionsService;
    }

    public registerDelegatedSigner(params: { chain: SolanaChain; signer: string }): Promise<DelegatedSigner> {
        return super.registerDelegatedSigner(params);
    }
}
