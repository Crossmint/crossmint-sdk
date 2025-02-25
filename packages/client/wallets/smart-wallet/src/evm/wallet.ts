import {
    type PublicClient,
    type HttpTransport,
    type WriteContractParameters,
    type ContractFunctionName,
    type Abi,
    type ContractFunctionArgs,
    type Hex,
    type Address,
    encodeFunctionData,
} from "viem";

import type { CrossmintApiService } from "../apiService";
import { InvalidTransferChainError } from "../error";
import type { TransferType } from "../types/transfer";

import type { SmartWalletChain } from "./chains";
import type { SmartWalletClient } from "./smartWalletClient";
import { transferParams } from "./transfer";

export class EVMSmartWallet {
    constructor(
        /**
         * [viem](https://viem.sh/) clients that provide an interface for core wallet functionality.
         */
        public readonly client: {
            /**
             * An interface to interact with the smart wallet, execute transactions, sign messages, etc.
             */
            public: PublicClient<HttpTransport>;
            /**
             * An interface to read onchain data, fetch transactions, retrieve account balances, etc. Corresponds to public [JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/) methods.
             */
            wallet: SmartWalletClient;
        },
        public readonly chain: SmartWalletChain,
        private readonly apiService: CrossmintApiService
    ) {}

    /**
     * The address of the smart wallet.
     */
    public get address() {
        return this.client.wallet.getAddress();
    }

    /**
     * Transfers tokens from the smart wallet to a specified address.
     * @param toAddress The recipient's address.
     * @param config The transfer configuration, including token details and amount.
     * @throws {InvalidTransferChainError} If the chain of the token does not match the chain of the wallet.
     * @returns The transaction hash.
     */
    public async transferToken(toAddress: Address, config: TransferType): Promise<string> {
        if (this.chain !== config.token.chain) {
            throw new InvalidTransferChainError(
                `Chain mismatch: Expected ${config.token.chain}, but got ${this.chain}. Ensure you are interacting with the correct blockchain.`
            );
        }

        return await this.executeContract(
            transferParams({
                contract: config.token.contractAddress,
                from: this.address,
                to: toAddress,
                config,
            })
        );
    }

    /**
     * @returns A list of NFTs owned by the wallet.
     */
    public async nfts() {
        return await this.apiService.getNfts(`${this.chain}:${this.address}`);
    }

    /**
     * Sends a contract call transaction and returns the hash of a confirmed transaction.
     * @param address the address of the contract to be called
     * @param abi the ABI of the contract - ***should be defined as a typed variable*** to enable type checking of the contract arguments, see https://viem.sh/docs/typescript#type-inference for guidance
     * @param functionName the name of the smart contract function to be called
     * @param args the arguments to be passed to the function
     * @returns The transaction hash.
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
        >,
    >({
        address,
        abi,
        functionName,
        args,
        value,
    }: Omit<WriteContractParameters<TAbi, TFunctionName, TArgs>, "chain" | "account">): Promise<Hex> {
        // @ts-ignore
        const data = encodeFunctionData({
            abi,
            functionName,
            args,
        });
        return await this.client.wallet.sendTransaction({
            to: address,
            data,
            value,
        });
    }
}
