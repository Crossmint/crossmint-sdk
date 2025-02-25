import type {
    Abi,
    Address,
    ContractFunctionArgs,
    ContractFunctionName,
    Hex,
    SignableMessage,
    TypedData,
    TypedDataDefinition,
    WriteContractParameters,
} from "viem";

import type {
    // biome-ignore lint/correctness/noUnusedImports: used in JSDoc
    InvalidMessageFormatError,
    // biome-ignore lint/correctness/noUnusedImports: used in JSDoc
    MessageSigningError,
    // biome-ignore lint/correctness/noUnusedImports: used in JSDoc
    TypedDataSigningError,
    // biome-ignore lint/correctness/noUnusedImports: used in JSDoc
    InvalidTypedDataError,
    // biome-ignore lint/correctness/noUnusedImports: used in JSDoc
    TransactionApprovalError,
    // biome-ignore lint/correctness/noUnusedImports: used in JSDoc
    TransactionFailedError,
    // biome-ignore lint/correctness/noUnusedImports: used in JSDoc
    TransactionNotFoundError,
} from "@/error";

export interface SmartWalletClient {
    /**
     * Retrieves the address of the smart wallet.
     * @returns The address of the smart wallet.
     */
    getAddress: () => Address;

    /**
     * Retrieves the nonce of the smart wallet.
     * @param parameters - The parameters.
     * @returns The nonce of the smart wallet.
     */
    getNonce?: ((parameters?: { key?: bigint | undefined } | undefined) => Promise<bigint>) | undefined;

    /**
     * Signs a message.
     * @param parameters - The parameters.
     * @returns The message signature
     * @throws {InvalidMessageFormatError} if the message is not a string.
     * @throws {MessageSigningError} if the message signing fails.
     */
    signMessage: (parameters: { message: SignableMessage }) => Promise<Hex>;

    /**
     * Signs typed data message.
     * @param parameters - The parameters.
     * @returns The message signature
     * @throws {InvalidTypedDataError} if the typed data is invalid.
     * @throws {TypedDataSigningError} if the typed data signing fails.
     */
    signTypedData: <
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(
        parameters: TypedDataDefinition<typedData, primaryType>
    ) => Promise<Hex>;

    /**
     * Sends a transaction.
     * @param parameters - The parameters.
     * @returns The transaction hash
     * @throws {TransactionApprovalError} if the transaction is not approved.
     * @throws {TransactionFailedError} if the transaction fails.
     * @throws {TransactionNotFoundError} if the transaction is not found.
     */
    sendTransaction: (parameters: {
        to: Address;
        data?: Hex;
        value?: bigint;
    }) => Promise<Hex>;

    /**
     * Writes to a contract.
     * @param parameters - The parameters.
     * @returns The transaction hash
     * @throws {TransactionApprovalError} if the transaction is not approved.
     * @throws {TransactionFailedError} if the transaction fails.
     * @throws {TransactionNotFoundError} if the transaction is not found.
     */
    writeContract<
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
    }: Omit<WriteContractParameters<TAbi, TFunctionName, TArgs>, "chain" | "account">): Promise<Hex>;
}
