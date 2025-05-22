import { BaseDelegatedSignerService } from "./base-service";
import type { ApiClient, DelegatedSigner } from "../../api";
import type { EvmWalletLocator } from "../../api";
import type { EVMSigner, EVMChain } from "../../types";

export class EVMDelegatedSignerService extends BaseDelegatedSignerService<EvmWalletLocator> {
    protected readonly adminSigner: EVMSigner;

    constructor(apiClient: ApiClient, walletLocator: EvmWalletLocator, adminSigner: EVMSigner) {
        super(apiClient, walletLocator);
        this.adminSigner = adminSigner;
    }

    public registerDelegatedSigner(params: { chain: EVMChain; signer: string }): Promise<DelegatedSigner> {
        return super.registerDelegatedSigner(params);
    }
}
