import type { ApiClient, DelegatedSigner } from "../../api";
import type { Chain } from "../../types";

export abstract class BaseDelegatedSignerService<TWalletLocator extends string = string> {
    constructor(
        protected readonly apiClient: ApiClient,
        protected readonly walletLocator: TWalletLocator
    ) {}

    public async registerDelegatedSigner(params: { chain: Chain; signer: string }): Promise<DelegatedSigner> {
        const response = await this.apiClient.registerDelegatedSigner(this.walletLocator, {
            chain: params.chain,
            signer: params.signer,
        });
        if ("error" in response) {
            throw new Error(`Failed to register delegated signer: ${JSON.stringify(response.error)}`);
        }
        return response;
    }

    public async getDelegatedSigners(): Promise<DelegatedSigner[]> {
        const response = await this.apiClient.getDelegatedSigners(this.walletLocator);
        if ("error" in response) {
            throw new Error(`Failed to get delegated signers: ${JSON.stringify(response.error)}`);
        }
        return response;
    }
}
