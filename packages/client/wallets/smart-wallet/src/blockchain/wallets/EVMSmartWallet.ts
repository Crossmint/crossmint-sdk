import { logError, logInfo } from "@/services/logging";
import { type HttpTransport, type PublicClient, isAddress, publicActions } from "viem";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { TransferError } from "../../error";
import { SmartWalletClient } from "../../types/internal";
import type { TransferType } from "../../types/token";
import { SCW_SERVICE } from "../../utils/constants";
import { errorToJSON, logPerformance } from "../../utils/log";
import { SmartWalletChain } from "../chains";
import { transferParams } from "../transfer";

/**
 * Smart wallet interface for EVM chains enhanced with Crossmint capabilities.
 * Core functionality is exposed via [viem](https://viem.sh/) clients within the `client` property of the class.
 */
export class EVMSmartWallet {
    public readonly chain: SmartWalletChain;

    /**
     * [viem](https://viem.sh/) clients that provide an interface for core wallet functionality.
     */
    public readonly client: {
        /**
         * An interface to interact with the smart wallet, execute transactions, sign messages, etc.
         */
        wallet: SmartWalletClient;

        /**
         * An interface to read onchain data, fetch transactions, retrieve account balances, etc. Corresponds to public [JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/) methods.
         */
        public: PublicClient;
    };

    constructor(
        private readonly crossmintService: CrossmintWalletService,
        private readonly accountClient: SmartWalletClient,
        publicClient: PublicClient<HttpTransport>,
        chain: SmartWalletChain
    ) {
        this.chain = chain;
        this.client = {
            wallet: accountClient,
            public: publicClient,
        };
    }

    /**
     * The address of the smart wallet.
     */
    public get address() {
        return this.accountClient.account.address;
    }

    /**
     * @returns The transaction hash.
     */
    public async transferToken(toAddress: string, config: TransferType): Promise<string> {
        return logPerformance(
            "TRANSFER",
            async () => {
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
                    from: this.accountClient.account,
                    config,
                });

                try {
                    const client = this.accountClient.extend(publicActions);
                    const { request } = await client.simulateContract(tx);
                    const hash = await client.writeContract(request);
                    logInfo(`[TRANSFER] - Transaction hash from transfer: ${hash}`);

                    return hash;
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
            },
            { toAddress, config }
        );
    }

    /**
     * @returns A list of NFTs owned by the wallet.
     */
    public async nfts() {
        return this.crossmintService.fetchNFTs(this.address, this.chain);
    }
}
