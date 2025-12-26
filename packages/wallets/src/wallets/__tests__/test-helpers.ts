import { vi, type MockedFunction } from "vitest";
import { Wallet } from "../wallet";
import type { ApiClient } from "../../api";
import type { Chain } from "../../chains/chains";
import type { Signer } from "../../signers/types";


export type MockedApiClient = {
    isServerSide: boolean;
    createTransaction: MockedFunction<ApiClient["createTransaction"]>;
    createSignature: MockedFunction<ApiClient["createSignature"]>;
    getTransaction: MockedFunction<ApiClient["getTransaction"]>;
    getSignature: MockedFunction<ApiClient["getSignature"]>;
    approveTransaction: MockedFunction<ApiClient["approveTransaction"]>;
    approveSignature: MockedFunction<ApiClient["approveSignature"]>;
    getBalance: MockedFunction<ApiClient["getBalance"]>;
    send: MockedFunction<ApiClient["send"]>;
    getWallet: MockedFunction<ApiClient["getWallet"]>;
    registerSigner: MockedFunction<ApiClient["registerSigner"]>;
};

const getChainAddress = (chain: Chain): string => {
    switch (chain) {
        case "solana":
            return "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
        case "stellar":
            return "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY";
        default:
            return "0x1234567890123456789012345678901234567890";
    }
};

const getSignerLocator = (type: "api-key" | "external-wallet", chain: Chain): string => {
    if (type === "api-key") return "api-key:test";
    switch (chain) {
        case "solana":
            return "external-wallet:ABC123";
        case "stellar":
            return "external-wallet:GABC123";
        default:
            return "external-wallet:0x123";
    }
};

export const createMockSigner = (type: "api-key" | "external-wallet" = "api-key", chain: Chain = "base-sepolia"): Signer => {
    const signer = {
        type,
        locator: () => getSignerLocator(type, chain),
        signTransaction: vi.fn().mockResolvedValue({ signature: "0xsigned" }),
        signMessage: vi.fn().mockResolvedValue({ signature: "0xsigned" }),
    } as unknown as Signer;
    return signer;
};

export const createMockWallet = <C extends Chain>(
    chain: C,
    mockApiClient: MockedApiClient,
    signerType: "api-key" | "external-wallet" = "api-key"
): Wallet<C> => {
    const signer = createMockSigner(signerType, chain);
    return new Wallet(
        {
            chain,
            address: getChainAddress(chain),
            signer,
        },
        mockApiClient as unknown as ApiClient
    );
};

export const createMockApiClient = (overrides: Partial<MockedApiClient> = {}): MockedApiClient => ({
    isServerSide: false,
    createTransaction: vi.fn(),
    createSignature: vi.fn(),
    getTransaction: vi.fn(),
    getSignature: vi.fn(),
    approveTransaction: vi.fn(),
    approveSignature: vi.fn(),
    getBalance: vi.fn(),
    send: vi.fn(),
    getWallet: vi.fn(),
    registerSigner: vi.fn(),
    ...overrides,
});

export const createMockSerializedTransaction = (): string => {
    return "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgEDBQrKxEIIPWsDwcGCzLQ7FGIHQ38p0dZq6bG2v2wUAUqMx3jV1jZ0";
};

