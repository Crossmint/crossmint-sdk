import { logError } from "@/services/logging";
import { SCW_SERVICE, TransferError, errorToJSON, usesGelatoBundler } from "@/utils";
import { LoggerWrapper } from "@/utils/log";
import { KernelAccountClient, KernelSmartAccount, createKernelAccountClient } from "@zerodev/sdk";
import { SmartAccountClient } from "permissionless";
import { SmartAccount } from "permissionless/accounts";
import { EntryPoint } from "permissionless/types/entrypoint";
import type { HttpTransport, PublicClient } from "viem";
import { Chain, http, isAddress, publicActions } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { getBundlerRPC, getViemNetwork } from "../BlockchainNetworks";
import { TransferType, transferParams } from "../token/transfer";
import { paymasterMiddleware } from "./paymaster";
import { toCrossmintSmartAccountClient } from "./smartAccount";

export class EVMAAWallet extends LoggerWrapper {
    public readonly chain: EVMBlockchainIncludingTestnet;

    /**
     * [viem](https://viem.sh/) clients that provide an interface for core wallet functionality.
     */
    public readonly client: {
        /**
         * An interface to interact with the smart wallet, execute transactions, sign messages, etc.
         */
        wallet: SmartAccountClient<EntryPoint, HttpTransport, Chain, SmartAccount<EntryPoint>>;

        /**
         * An interface to read onchain data, fetch transactions, retrieve account balances, etc. Corresponds to public [JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/) methods.
         */
        public: PublicClient;
    };

    private readonly kernel: KernelAccountClient<
        EntryPoint,
        HttpTransport,
        Chain,
        KernelSmartAccount<EntryPoint, HttpTransport>
    >;

    constructor(
        private readonly crossmintService: CrossmintWalletService,
        account: KernelSmartAccount<EntryPoint, HttpTransport>,
        publicClient: PublicClient<HttpTransport>,
        entryPoint: EntryPoint,
        chain: EVMBlockchainIncludingTestnet
    ) {
        super("EVMAAWallet", { chain, address: account.address });
        const usePaymaster = !usesGelatoBundler(chain);
        const kernelParams = {
            account,
            chain: getViemNetwork(chain),
            entryPoint,
            bundlerTransport: http(getBundlerRPC(chain)),
            ...(usePaymaster && paymasterMiddleware({ entryPoint, chain })),
        };

        this.kernel = toCrossmintSmartAccountClient({
            crossmintChain: chain,
            smartAccountClient: createKernelAccountClient(kernelParams),
        });
        this.chain = chain;
        this.client = {
            wallet: this.kernel,
            public: publicClient,
        };
    }

    public get address() {
        return this.kernel.account.address;
    }

    public async transfer(toAddress: string, config: TransferType): Promise<string> {
        return this.logPerformance("TRANSFER", async () => {
            if (this.chain !== config.token.chain) {
                throw new Error(
                    `Chain mismatch: Expected ${config.token.chain}, but got ${this.chain}. Ensure you are interacting with the correct blockchain.`
                );
            }

            if (!isAddress(toAddress)) {
                throw new Error(`Invalid recipient address: '${toAddress}' is not a valid EVM address.`);
            }

            if (!isAddress(config.token.contractAddress)) {
                throw new Error(
                    `Invalid contract address: '${config.token.contractAddress}' is not a valid EVM address.`
                );
            }

            const tx = transferParams({
                contract: config.token.contractAddress,
                to: toAddress,
                from: this.kernel.account,
                config,
            });

            try {
                const client = this.kernel.extend(publicActions);
                const { request } = await client.simulateContract(tx);
                return client.writeContract(request);
            } catch (error) {
                logError("[TRANSFER] - ERROR_TRANSFERRING_TOKEN", {
                    service: SCW_SERVICE,
                    error: errorToJSON(error),
                    tokenId: tx.tokenId,
                    contractAddress: config.token.contractAddress,
                    chain: config.token.chain,
                });
                const tokenIdString = tx.tokenId == null ? "" : `:${tx.tokenId}}`;
                throw new TransferError(`Error transferring token ${config.token.contractAddress}${tokenIdString}`);
            }
        });
    }

    public async getNFTs() {
        return this.logPerformance("GET_NFTS", async () => {
            return this.crossmintService.fetchNFTs(this.kernel.account.address, this.chain);
        });
    }
}
