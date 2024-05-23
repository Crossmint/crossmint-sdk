import { hasEIP1559Support } from "@/utils";
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk";
import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { UserOperation } from "permissionless";
import { EntryPointVersion } from "permissionless/_types/types";
import { EntryPoint } from "permissionless/types/entrypoint";
import type { Chain, HttpTransport, PublicClient } from "viem";
import { http } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { getBundlerRPC, getPaymasterRPC, getViemNetwork } from "../BlockchainNetworks";

export class EVMAAWallet {
    public chain: EVMBlockchainIncludingTestnet;
    public publicClient: PublicClient<HttpTransport>;
    private kernelClient: KernelAccountClient<
        EntryPoint,
        HttpTransport,
        Chain,
        KernelSmartAccount<EntryPoint, HttpTransport>
    >;

    constructor(
        private readonly account: KernelSmartAccount<EntryPoint, HttpTransport>,
        private readonly crossmintService: CrossmintWalletService,
        chain: EVMBlockchainIncludingTestnet,
        publicClient: PublicClient<HttpTransport>,
        entryPoint: EntryPoint
    ) {
        this.chain = chain;

        const sponsorUserOperation = ({ userOperation }: { userOperation: UserOperation<EntryPointVersion> }) =>
            createZeroDevPaymasterClient({
                chain: getViemNetwork(chain),
                transport: http(getPaymasterRPC(chain)),
                entryPoint,
            }).sponsorUserOperation({
                userOperation,
                entryPoint,
            });

        this.kernelClient = createKernelAccountClient({
            account,
            chain: getViemNetwork(chain) as Chain, // Fix getViemNetwork definition
            entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(hasEIP1559Support(chain) && { middleware: { sponsorUserOperation } }),
        });
        this.publicClient = publicClient;
    }

    getAddress() {
        return this.kernelClient.account.address;
    }

    getSigner() {
        return this.kernelClient;
    }

    async getNFTs() {
        return this.crossmintService.fetchNFTs(this.account.address, this.chain);
    }
}
