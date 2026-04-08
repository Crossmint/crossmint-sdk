import { vi, type MockedFunction } from "vitest";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { Wallet } from "../wallet";
import type { ApiClient } from "../../api";
import type { Chain } from "../../chains/chains";
import type { SignerConfigForChain, SignerLocator } from "../../signers/types";

export type MockedApiClient = {
    isServerSide: boolean;
    environment: APIKeyEnvironmentPrefix;
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
    removeSigner: MockedFunction<ApiClient["removeSigner"]>;
    getSigner: MockedFunction<ApiClient["getSigner"]>;
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

const getSignerLocator = (type: "api-key" | "external-wallet", chain: Chain): SignerLocator => {
    if (type === "api-key") {
        return "api-key";
    }
    switch (chain) {
        case "solana":
            return "external-wallet:ABC123";
        case "stellar":
            return "external-wallet:GABC123";
        default:
            return "external-wallet:0x123";
    }
};

export const createMockSigner = <C extends Chain>(
    type: "api-key" | "external-wallet" = "api-key",
    chain: C = "base-sepolia" as C
): SignerConfigForChain<C> => {
    if ("api-key" === type) {
        return {
            type,
        } as SignerConfigForChain<C>;
    }
    return {
        type,
        address: getSignerLocator(type, chain).split(":")[1],
        onSign: vi.fn().mockResolvedValue("0xsigned"),
    } as unknown as SignerConfigForChain<C>;
};

export const createMockWallet = async <C extends Chain>(
    chain: C,
    mockApiClient: MockedApiClient,
    signerType: "api-key" | "external-wallet" = "api-key"
): Promise<Wallet<C>> => {
    const signer = createMockSigner(signerType, chain);
    const wallet = new Wallet(
        {
            chain,
            address: getChainAddress(chain),
            recovery: { type: "api-key" } as SignerConfigForChain<C>,
        },
        mockApiClient as unknown as ApiClient
    );
    vi.spyOn(wallet, "signers").mockImplementation(() =>
        Promise.resolve([
            {
                type: signerType === "api-key" ? "api-key" : "external-wallet",
                address: getChainAddress(chain),
                locator: getSignerLocator(signerType, chain),
                status: "success" as const,
            } as any,
        ])
    );
    await wallet.useSigner(signer);
    return wallet;
};

export const createMockApiClient = (overrides: Partial<MockedApiClient> = {}): MockedApiClient => ({
    isServerSide: false,
    environment: APIKeyEnvironmentPrefix.STAGING,
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
    removeSigner: vi.fn(),
    getSigner: vi.fn(),
    ...overrides,
});

export const createMockSolanaSerializedTransaction = (): string => {
    return "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgEDBQrKxEIIPWsDwcGCzLQ7FGIHQ38p0dZq6bG2v2wUAUqMx3jV1jZ0";
};
