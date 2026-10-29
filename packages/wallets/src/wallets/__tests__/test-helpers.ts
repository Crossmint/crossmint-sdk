import { vi, type MockedFunction } from "vitest";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { Wallet } from "../wallet";
import type { ApiClient } from "../../api";
import type { Chain } from "../../chains/chains";
import type {
    QuorumMember,
    QuorumSigner,
    RecoverySignerConfigForChain,
    SignerAdapter,
    SignerConfigForChain,
    SignerLocator,
} from "../../signers/types";
import type { PendingApproval } from "../types";

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
    registerRecoveryMethod: MockedFunction<ApiClient["registerRecoveryMethod"]>;
    removeRecoveryMethod: MockedFunction<ApiClient["removeRecoveryMethod"]>;
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
    signerType: "api-key" | "external-wallet" = "api-key",
    recoverySigners?: Array<RecoverySignerConfigForChain<C>>
): Promise<Wallet<C>> => walletWithSigner(chain, mockApiClient, createMockSigner(signerType, chain), recoverySigners);

// What a signing test signer returns for `payload`, so a test can tell which message each approval signed.
export const signatureOver = (payload: string) => `0xsig:${payload}`;

// A wallet whose active signer is a registered external wallet that signs with `signatureOver`.
export const createSigningWallet = async <C extends Chain>(
    chain: C,
    mockApiClient: MockedApiClient,
    recoverySigners?: Array<RecoverySignerConfigForChain<C>>
): Promise<Wallet<C>> => {
    const signer = {
        ...createMockSigner("external-wallet", chain),
        onSign: vi.fn(async (payload: string) => signatureOver(payload)),
    } as SignerConfigForChain<C>;
    return walletWithSigner(chain, mockApiClient, signer, recoverySigners);
};

// The active signer of `createSigningWallet` and `createMockWallet(…, "external-wallet")`, as a quorum member.
export const activeSignerMember = (chain: Chain): QuorumMember => {
    const locator = getSignerLocator("external-wallet", chain);
    return { type: "external-wallet", address: locator.split(":")[1], locator } as QuorumMember;
};

// A signer this client holds beyond the active one (`approve`'s `additionalSigners`), signing with `signatureOver`.
export const createHeldSigner = (locator: SignerLocator): SignerAdapter => {
    const sign = vi.fn(async (payload: string) => ({ signature: signatureOver(payload) }));
    return {
        type: locator.split(":")[0],
        locator: () => locator,
        signMessage: sign,
        signTransaction: sign,
    } as unknown as SignerAdapter;
};

const walletWithSigner = async <C extends Chain>(
    chain: C,
    mockApiClient: MockedApiClient,
    signer: SignerConfigForChain<C>,
    recoverySigners?: Array<RecoverySignerConfigForChain<C>>
): Promise<Wallet<C>> => {
    const signerType = signer.type === "api-key" ? "api-key" : "external-wallet";
    const wallet = new Wallet(
        {
            chain,
            address: getChainAddress(chain),
            recovery: recoverySigners ?? ({ type: "api-key" } as RecoverySignerConfigForChain<C>),
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
    registerRecoveryMethod: vi.fn(),
    removeRecoveryMethod: vi.fn(),
    getSigner: vi.fn(),
    ...overrides,
});

// The API issues version-8 UUIDs for quorum locators.
const randomQuorumId = () => crypto.randomUUID().replace(/^(.{14})4/, "$18");
const randomEvmAddress = () => `0x${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().slice(0, 8)}`;

// A quorum entry as the wallets API returns it. Members are random so no test depends on them.
export const createQuorumApiEntry = ({ threshold = 2, memberCount = 3 } = {}) => {
    const members = Array.from({ length: memberCount }, () => {
        const email = `member-${crypto.randomUUID()}@example.com`;
        return { type: "email" as const, email, address: randomEvmAddress(), locator: `email:${email}` };
    });
    return {
        type: "quorum" as const,
        locator: `quorum:${randomQuorumId()}` as const,
        threshold,
        members,
    } satisfies QuorumSigner;
};

// A quorum entry of `approvals.pending` as the wallets API returns it. Each member gets its own random message.
export const createQuorumPendingApproval = ({
    quorum,
    pending = quorum.members,
    submitted = [],
    remaining = quorum.threshold - submitted.length,
}: {
    quorum: QuorumSigner;
    pending?: QuorumMember[];
    submitted?: QuorumMember[];
    remaining?: number;
}) =>
    ({
        signer: { type: "quorum", locator: quorum.locator },
        quorumApprovals: {
            threshold: quorum.threshold,
            remaining,
            pending: pending.map((member) => ({ member, message: randomHexMessage() })),
            submitted: submitted.map((member) => ({
                member,
                message: randomHexMessage(),
                signature: randomHexMessage(),
                submittedAt: new Date().toISOString(),
            })),
        },
    }) satisfies PendingApproval;

const randomHexMessage = () => `0x${crypto.randomUUID().replace(/-/g, "")}`;

// The wallets API's expiry message (crossbit-main `constants/error.ts`, `TRANSACTION_EXPIRED_MESSAGE`).
export const TRANSACTION_EXPIRED_API_MESSAGE =
    "The transaction expired before it could be submitted. Create a new transaction.";

// A transaction or signature request as the wallets API stores it once its approval window closed.
export const createExpiredRequest = (id: string) => ({
    id,
    status: "failed" as const,
    error: {
        reason: "execution_reverted",
        message: "Execution reverted, see 'revert' for details",
        revert: {
            type: "wallet_authorization",
            reason: TRANSACTION_EXPIRED_API_MESSAGE,
        },
    },
});

export const createMockSolanaSerializedTransaction = (): string => {
    return "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgEDBQrKxEIIPWsDwcGCzLQ7FGIHQ38p0dZq6bG2v2wUAUqMx3jV1jZ0";
};
