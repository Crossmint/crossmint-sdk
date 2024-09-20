import type { ObjectValues } from "@crossmint/common-sdk-base";

export const SessionRequestMethods = {
    EVM_PERSONAL_SIGN: "personal_sign",
    EVM_SIGN_TYPED_DATA: "eth_signTypedData",
    EVM_SIGN_TYPED_DATA_V4: "eth_signTypedData_v4",
    EVM_SEND_TRANSACTION: "eth_sendTransaction",
    SOLANA_SIGN_TRANSACTION: "solana_signTransaction",
    SOLANA_SIGN_MESSAGE: "solana_signMessage",
} as const;
export type SessionRequestMethods = ObjectValues<typeof SessionRequestMethods>;
