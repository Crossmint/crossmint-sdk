import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api";
import type { Chain } from "../chains/chains";
import type { QuorumMember, QuorumSigner, RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import { QuorumRequestError } from "../utils/errors";
import { Wallet } from "./wallet";
import { createMockApiClient, createQuorumApiEntry, type MockedApiClient } from "./__tests__/test-helpers";

vi.mock("@/signers/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/signers/server")>();
    return {
        ...actual,
        deriveServerSignerDetails: vi.fn().mockReturnValue({
            derivedKeyBytes: new Uint8Array(32),
            derivedAddress: "0xDerivedServerAddress",
        }),
        deriveServerSignerCandidates: vi.fn().mockReturnValue({
            primary: { derivedKeyBytes: new Uint8Array(32), derivedAddress: "0xDerivedServerAddress" },
            legacy: { derivedKeyBytes: new Uint8Array(32).fill(1), derivedAddress: "0xLegacyServerAddress" },
        }),
        assembleServerSigner: vi.fn().mockReturnValue({
            type: "server",
            locator: () => "server:0xDerivedServerAddress",
            address: () => "0xDerivedServerAddress",
            status: undefined,
            signMessage: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
            signTransaction: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
        }),
    };
});

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";
const SERVER_LOCATOR = "server:0xDerivedServerAddress";

// One key a person holds: the config passed to useSigner, and the member entry the API lists for it.
type MemberKey = { name: string; config: SignerConfigForChain<Chain>; member: QuorumMember };

const MEMBER_KEYS: MemberKey[] = [
    {
        name: "an external wallet",
        config: {
            type: "external-wallet",
            address: "0x4444444444444444444444444444444444444444",
            onSign: vi.fn(),
        } as unknown as SignerConfigForChain<Chain>,
        member: {
            type: "external-wallet",
            address: "0x4444444444444444444444444444444444444444",
            locator: "external-wallet:0x4444444444444444444444444444444444444444",
        } as QuorumMember,
    },
    {
        name: "an email",
        config: { type: "email", email: "bob@acme.com" } as SignerConfigForChain<Chain>,
        member: { type: "email", email: "bob@acme.com", locator: "email:bob@acme.com" } as QuorumMember,
    },
    {
        name: "a phone",
        config: { type: "phone", phone: "+15550001111" } as SignerConfigForChain<Chain>,
        member: { type: "phone", phone: "+15550001111", locator: "phone:+15550001111" } as QuorumMember,
    },
    {
        name: "a passkey with its id",
        config: { type: "passkey", id: "bob-credential" } as SignerConfigForChain<Chain>,
        member: { type: "passkey", id: "bob-credential", locator: "passkey:bob-credential" } as QuorumMember,
    },
    {
        name: "a server key",
        config: { type: "server", secret: "bob-secret" } as SignerConfigForChain<Chain>,
        member: {
            type: "server",
            address: "0xDerivedServerAddress",
            locator: "server:0xDerivedServerAddress",
        } as QuorumMember,
    },
];

const memberKey = (type: QuorumMember["type"]): MemberKey => {
    const key = MEMBER_KEYS.find(({ member }) => member.type === type);
    if (key == null) {
        throw new Error(`No ${type} member key`);
    }
    return key;
};

function quorumOf(member: QuorumMember): QuorumSigner {
    const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
    return { ...quorum, members: [member, ...quorum.members.slice(1)] } as QuorumSigner;
}

async function walletWith(
    api: MockedApiClient,
    { recovery, signers = [] }: { recovery: object[]; signers?: object[] }
) {
    const wallet = new Wallet(
        {
            chain: "base-sepolia",
            address: EVM_ADDRESS,
            recovery: recovery as unknown as RecoverySignerConfigForChain<Chain>[],
        },
        api as unknown as ApiClient
    );
    await wallet.waitForInit();
    vi.spyOn(wallet, "signers").mockResolvedValue(signers as never);
    return wallet;
}

describe("useSigner() with a key that is only a quorum member", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        api = createMockApiClient();
    });

    describe.each(MEMBER_KEYS)("when the key is $name in a recovery quorum", ({ config, member }) => {
        it("selects the key as the active signer, active as its quorum, without looking it up as a signer", async () => {
            const wallet = await walletWith(api, { recovery: [{ type: "api-key" }, quorumOf(member)] });

            await wallet.useSigner(config);

            expect(wallet.signer?.locator()).toBe(member.locator);
            expect(wallet.signer?.status).toBe("active");
            expect(api.getSigner).not.toHaveBeenCalled();
        });
    });

    describe.each(MEMBER_KEYS)("when the key is $name in a delegated quorum", ({ config, member }) => {
        it("selects the key as the active signer, with its quorum's status", async () => {
            const quorum = { ...quorumOf(member), status: "awaiting-approval" };
            const wallet = await walletWith(api, { recovery: [{ type: "api-key" }], signers: [quorum] });

            await wallet.useSigner(config);

            expect(wallet.signer?.locator()).toBe(member.locator);
            expect(wallet.signer?.status).toBe("awaiting-approval");
            expect(api.getSigner).not.toHaveBeenCalled();
        });
    });

    describe("when the key is also a registered delegated signer", () => {
        it("resolves as that signer, with the status the API reports for it", async () => {
            const [externalWallet] = MEMBER_KEYS;
            api.getSigner.mockResolvedValue({
                type: "external-wallet",
                locator: externalWallet.member.locator,
                chains: { "base-sepolia": { status: "success", id: "s-1" } },
            } as never);
            const wallet = await walletWith(api, {
                recovery: [{ type: "api-key" }],
                signers: [
                    { ...quorumOf(externalWallet.member), status: "awaiting-approval" },
                    { ...externalWallet.member, status: "success" },
                ],
            });

            await wallet.useSigner(externalWallet.config);

            expect(wallet.signer?.locator()).toBe(externalWallet.member.locator);
            expect(wallet.signer?.status).toBe("success");
        });

        it("resolves a server key as that signer too", async () => {
            const server = memberKey("server");
            api.getSigner.mockResolvedValue({
                type: "server",
                locator: SERVER_LOCATOR,
                chains: { "base-sepolia": { status: "success", id: "s-2" } },
            } as never);
            const wallet = await walletWith(api, {
                recovery: [{ type: "api-key" }],
                signers: [
                    { ...quorumOf(server.member), status: "awaiting-approval" },
                    { ...server.member, status: "success" },
                ],
            });

            await wallet.useSigner(server.config);

            expect(wallet.signer?.status).toBe("success");
        });
    });

    describe("when the key is also a recovery method", () => {
        it.each([
            { name: "an email", key: memberKey("email"), recovery: { type: "email", email: "bob@acme.com" } },
            {
                name: "a server key",
                key: memberKey("server"),
                recovery: { type: "server", address: "0xDerivedServerAddress" },
            },
        ])("resolves $name as the recovery method, active", async ({ key, recovery }) => {
            const wallet = await walletWith(api, {
                recovery: [recovery],
                signers: [{ ...quorumOf(key.member), status: "awaiting-approval" }],
            });

            await wallet.useSigner(key.config);

            expect(wallet.signer?.locator()).toBe(key.member.locator);
            expect(wallet.signer?.status).toBe("active");
            expect(api.getSigner).not.toHaveBeenCalled();
        });
    });

    describe("when the key is a passkey member and no id is given", () => {
        it("throws as before, so a member passkey needs its id", async () => {
            const passkey = memberKey("passkey");
            const wallet = await walletWith(api, { recovery: [{ type: "api-key" }, quorumOf(passkey.member)] });

            await expect(wallet.useSigner({ type: "passkey" } as SignerConfigForChain<Chain>)).rejects.toThrow(
                "No passkey signer is registered on this wallet."
            );
        });
    });

    describe("when the key is in no quorum and not registered", () => {
        it("throws that the signer is not registered", async () => {
            const [externalWallet] = MEMBER_KEYS;
            const wallet = await walletWith(api, {
                recovery: [{ type: "api-key" }, createQuorumApiEntry()],
                signers: [createQuorumApiEntry()],
            });

            await expect(wallet.useSigner(externalWallet.config)).rejects.toThrow(
                `Signer "${externalWallet.member.locator}" is not registered in this wallet.`
            );
        });
    });

    describe("when a member key sends without naming the quorum", () => {
        it("throws the API's SIGNER_IS_QUORUM_MEMBER as QuorumRequestError", async () => {
            const [externalWallet] = MEMBER_KEYS;
            const wallet = await walletWith(api, { recovery: [{ type: "api-key" }, quorumOf(externalWallet.member)] });
            await wallet.useSigner(externalWallet.config);
            api.send.mockResolvedValue({
                error: true,
                code: "SIGNER_IS_QUORUM_MEMBER",
                message: "The signer is a quorum member; name the quorum as signer.",
            } as never);

            const sending = wallet.send("0x1111111111111111111111111111111111111111", "usdc", "1");

            await expect(sending).rejects.toBeInstanceOf(QuorumRequestError);
            await expect(sending).rejects.toMatchObject({ reason: "SIGNER_IS_QUORUM_MEMBER" });
        });
    });
});
