import type {
    Abi,
    Address,
    ContractFunctionArgs,
    ContractFunctionName,
    Hex,
    HttpTransport,
    PublicClient,
    WriteContractParameters,
} from "viem";

import type { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { SmartWalletError } from "../../error";
import { scwLogger } from "../../services/logger";
import type { SmartWalletClient } from "../../types/internal";
import type { TransferType } from "../../types/token";
import type { SmartWalletChain } from "../chains";
import { transferParams } from "../transfer";
import { SendTransactionOptions, SendTransactionService } from "./SendTransactionService";

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
     * Transfers tokens from the smart wallet to a specified address.
     * @param toAddress The recipient's address.
     * @param config The transfer configuration, including token details and amount.
     * @returns The transaction hash.
     * @throws {SmartWalletError} If there's a chain mismatch between this wallet and the input configuration.
     * @throws {SendTransactionError} If the transaction fails to send. Contains the error thrown by the viem client.
     * @throws {SendTransactionExecutionRevertedError} A subclass of SendTransactionError if the transaction fails due to a contract execution error.
     */
    public async transferToken(toAddress: Address, config: TransferType): Promise<string> {
        if (this.chain !== config.token.chain) {
            throw new SmartWalletError(
                `Chain mismatch: Expected ${config.token.chain}, but got ${this.chain}. Ensure you are interacting with the correct blockchain.`
            );
        }

        return this.executeContract(
            transferParams({
                contract: config.token.contractAddress,
                to: toAddress,
                from: this.accountClient.account,
                config,
            })
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
     * await wallet.executeContract({
     *   address: contractAddress,
     *   abi,
     *   functionName: "mintNFT",
     *   args: [recipientAddress],
     * });
     */
    public async executeContract<
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
        config,
    }: Omit<WriteContractParameters<TAbi, TFunctionName, TArgs>, "chain" | "account"> & {
        config?: Partial<SendTransactionOptions>;
    }): Promise<Hex> {
        return this.sendTransactionService.sendTransaction(
            {
                address,
                abi: abi as Abi,
                functionName,
                args,
                value,
            },
            this.accountClient,
            config
        );
    }
}
