import { hasEIP1559Support } from "@/utils";
import type { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk";
import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { bundlerActions } from "permissionless";
import { Middleware } from "permissionless/actions/smartAccount";
import { EntryPoint } from "permissionless/types/entrypoint";
import type { HttpTransport, PublicClient } from "viem";
import { http } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { TChain, getBundlerRPC, getPaymasterRPC, getViemNetwork } from "../BlockchainNetworks";

// TODO
// - Fix the fact that `sendTransaction` requires a chain property

export class EVMAAWallet {
    public chain: EVMBlockchainIncludingTestnet;
    public publicClient: PublicClient<HttpTransport>;
    private kernelClient: KernelAccountClient<
        EntryPoint,
        HttpTransport,
        TChain,
        KernelSmartAccount<EntryPoint, HttpTransport, TChain>
    >;

    constructor(
        private readonly account: KernelSmartAccount<EntryPoint, HttpTransport, TChain>,
        private readonly crossmintService: CrossmintWalletService,
        chain: EVMBlockchainIncludingTestnet,
        publicClient: PublicClient<HttpTransport>,
        entryPoint: EntryPoint
    ) {
        this.chain = chain;

        const paymasterMiddleware: Middleware<EntryPoint> = {
            middleware: {
                sponsorUserOperation: async ({ userOperation }) => {
                    const paymasterClient = createZeroDevPaymasterClient({
                        chain: getViemNetwork(chain),
                        transport: http(getPaymasterRPC(chain)),
                        entryPoint,
                    });
                    return paymasterClient.sponsorUserOperation({
                        userOperation,
                        entryPoint,
                    });
                },
            },
        };
        this.kernelClient = createKernelAccountClient({
            account,
            chain: getViemNetwork(chain),
            entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(hasEIP1559Support(chain) && paymasterMiddleware),
        });
        this.publicClient = publicClient;
    }

    get address() {
        return this.kernelClient.account.address;
    }

    get signer() {
        return this.kernelClient;
    }

    get bundlerClient() {
        return this.kernelClient.extend(bundlerActions(this.signer.account.entryPoint));
    }

    async getNFTs() {
        return this.crossmintService.fetchNFTs(this.account.address, this.chain);
    }
}
