import type { Address, Hex, SignableMessage, TypedData, TypedDataDefinition } from "viem";

export interface SmartWalletClient {
    getAddress: () => Address;

    getNonce?: ((parameters?: { key?: bigint | undefined } | undefined) => Promise<bigint>) | undefined;

    signMessage: (parameters: { message: SignableMessage }) => Promise<Hex>;

    signTypedData: <
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(
        parameters: TypedDataDefinition<typedData, primaryType>
    ) => Promise<Hex>;

    sendTransaction: (parameters: {
        to: Address;
        data?: Hex;
        value?: bigint;
    }) => Promise<Hex>;
}
