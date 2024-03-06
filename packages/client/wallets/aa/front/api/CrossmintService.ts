import { CrossmintWalletService } from "@crossmint/client-sdk-aa";

export class CrossminService extends CrossmintWalletService {
    async getWalletPolicies(address: string, chain: string) {
        return this.fetchCrossmintAPI(
            `unstable/wallets/aa/policies?chain=${chain}&address=${address}`,
            { method: "GET" },
            `Error getting policies for address ${address} on chain: ${chain}`
        );
    }
}
