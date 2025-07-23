// Re-export the main stellar-sdk module
export * from "@stellar/stellar-sdk";

// Re-export contract types from @stellar/stellar-sdk/contract
export {
    AssembledTransaction,
    Client,
    Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";

export type {
    MethodOptions,
    ClientOptions as ContractClientOptions,
    u32,
    i128,
    u64,
    Option,
    Result,
} from "@stellar/stellar-sdk/contract";

// Re-export the entire contract module for libraries that need it
export * as contract from "@stellar/stellar-sdk/contract";

// Re-export the entire rpc module for libraries that need it
export * as rpc from "@stellar/stellar-sdk/rpc";
