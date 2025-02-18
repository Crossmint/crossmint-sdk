import type {
    Address,
    Hex,
    SignableMessage,
    PublicClient,
    HttpTransport,
    TypedData,
    TypedDataDefinition,
} from "viem";

import type { SmartWalletChain } from "./chains";

export interface ViemWallet {
    getAddress: () => Address;

    getNonce?:
        | ((
              parameters?: { key?: bigint | undefined } | undefined
          ) => Promise<bigint>)
        | undefined;

    signMessage: (parameters: { message: SignableMessage }) => Promise<Hex>;

    signTypedData: <
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
    >(
        parameters: TypedDataDefinition<typedData, primaryType>
    ) => Promise<Hex>;

    sendTransaction: (parameters: {
        to: Address;
        data?: Hex;
        value?: bigint;
    }) => Promise<Hex>;
}

export class EVMSmartWallet implements ViemWallet {
    constructor(
        public readonly publicClient: PublicClient<HttpTransport>,
        public readonly chain: SmartWalletChain,
        private readonly address: Address
    ) {}

    public async balances() {}
    public async transactions() {}
    public async nfts() {}

    public getAddress() {
        return this.address;
    }

    // biome-ignore lint/suspicious/useAwait: <explanation>
    public async getNonce(
        parameters?: { key?: bigint | undefined } | undefined
    ): Promise<bigint> {
        throw new Error("Not implemented");
    }

    // biome-ignore lint/suspicious/useAwait: <explanation>
    public async signMessage(parameters: {
        message: SignableMessage;
    }): Promise<Hex> {
        throw new Error("Not implemented");
    }

    // biome-ignore lint/suspicious/useAwait: <explanation>
    public async signTypedData<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
    >(parameters: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
        throw new Error("Not implemented");
    }

    // biome-ignore lint/suspicious/useAwait: <explanation>
    public async sendTransaction(parameters: {
        to: Address;
        data?: Hex;
        value?: bigint;
    }): Promise<Hex> {
        throw new Error("Not implemented");
    }
}

export class EVMMPCWallet {}
