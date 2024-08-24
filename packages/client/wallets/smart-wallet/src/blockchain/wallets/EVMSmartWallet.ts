import {
    Abi,
    ContractFunctionArgs,
    ContractFunctionName,
    Hex,
    type HttpTransport,
    type PublicClient,
    WriteContractParameters,
    isAddress,
    publicActions,
} from "viem";

import { TransferError } from "@crossmint/client-sdk-base";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { scwLogger } from "../../services/logger";
import { SmartWalletClient } from "../../types/internal";
import type { TransferType } from "../../types/token";
import { SmartWalletChain } from "../chains";
import { transferParams } from "../transfer";
import { SendTransactionService } from "./SendTransactionService";

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
    private readonly sendTransactionService: SendTransactionService;

    constructor(
        private readonly crossmintService: CrossmintWalletService,
        private readonly accountClient: SmartWalletClient,
        publicClient: PublicClient<HttpTransport>,
        chain: SmartWalletChain,
        protected readonly logger = scwLogger
    ) {
        this.chain = chain;
        this.client = {
            wallet: accountClient,
            public: publicClient,
        };
        this.sendTransactionService = new SendTransactionService(publicClient);
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
        return this.logger.logPerformance(
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
                    this.logger.log(`[TRANSFER] - Transaction hash from transfer: ${hash}`);

                    return hash;
                } catch (error) {
                    this.logger.error("[TRANSFER] - ERROR_TRANSFERRING_TOKEN", {
                        error: error instanceof Error ? error.message : JSON.stringify(error),
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

    /**
     * Sends a contract call transaction and returns the hash of a confirmed transaction.
     * @param address the address of the contract to be called
     * @param abi the ABI of the contract - ***should be defined as a typed variable*** to enable type checking of the contract arguments, see https://viem.sh/docs/typescript#type-inference for guidance
     * @param functionName the name of the smart contract function to be called
     * @param args the arguments to be passed to the function
     * @returns The transaction hash.
     * @throws `SendTransactionError` if the transaction fails to send. Contains the error thrown by the viem client.
     * @throws `SendTransactionExecutionRevertedError`, a subclass of `SendTransactionError` if the transaction fails due to a contract execution error.
     *
     * **Passing a typed ABI:**
     * @example
     * const abi = [{
     *   "inputs": [
     *     {
     *       "internalType": "address",
     *         "name": "recipient",
     *         "type": "address"
     *       },
     *   ],
     *   "name": "mintNFT",
     *   "outputs": [],
     *   "stateMutability": "nonpayable",
     *   "type": "function"
     * }] as const;
     *
     * await wallet.sendTransaction({
     *   address: contractAddress,
     *   abi,
     *   functionName: "mintNFT",
     *   args: [recipientAddress],
     * });
     */
    public async callContract<
        const TAbi extends Abi | readonly unknown[],
        TFunctionName extends ContractFunctionName<TAbi, "nonpayable" | "payable"> = ContractFunctionName<
            TAbi,
            "nonpayable" | "payable"
        >,
        TArgs extends ContractFunctionArgs<TAbi, "nonpayable" | "payable", TFunctionName> = ContractFunctionArgs<
            TAbi,
            "nonpayable" | "payable",
            TFunctionName
        >
    >({
        address,
        abi,
        functionName,
        args,
        value,
    }: Omit<WriteContractParameters<TAbi, TFunctionName, TArgs>, "chain" | "account">): Promise<Hex> {
        return this.sendTransactionService.sendTransaction(
            {
                address,
                abi: abi as Abi,
                functionName,
                args,
                value,
            },
            this.accountClient
        );
    }
}
