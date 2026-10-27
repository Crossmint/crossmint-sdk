import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient, CreateTransactionSuccessResponse, SendResponse } from "../api";
import type { Chain } from "../chains/chains";
import type { ServerSignerConfig } from "../signers/types";
import { EVMWallet } from "./evm";
import { SolanaWallet } from "./solana";
import { StellarWallet } from "./stellar";
import { Wallet } from "./wallet";
import {
    createMockApiClient,
    createMockSolanaSerializedTransaction,
    createMockWallet,
    type MockedApiClient,
} from "./__tests__/test-helpers";
import type { SignerOption } from "./types";

const SERVER_CONFIG = { type: "server", secret: "server-secret" } as ServerSignerConfig;
const DERIVED_SERVER_LOCATOR = "server:0xDerivedServer";
const EXPLICIT_LOCATOR = "external-wallet:0xExplicit";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const STELLAR_CONTRACT = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const CREATED = { id: "txn-1" } as unknown as CreateTransactionSuccessResponse;

// Each path creates a prepared transaction with `signer`, and returns the `signer` field it sent.
type SignerPath = {
    name: string;
    chain: Chain;
    create: (wallet: Wallet<Chain>, signer: SignerOption | undefined) => Promise<unknown>;
    sentSigner: (api: MockedApiClient) => unknown;
};

const createdSigner = (api: MockedApiClient) => api.createTransaction.mock.calls[0][1].params.signer;

// Chain wallets are built with `from()`, a new object, so the spy goes on the shared prototype.
const stubServerSignerResolution = () =>
    vi
        .spyOn(
            Wallet.prototype as unknown as { resolveServerSignerApiLocator: () => string },
            "resolveServerSignerApiLocator"
        )
        .mockReturnValue(DERIVED_SERVER_LOCATOR);

const SIGNER_PATHS: SignerPath[] = [
    {
        name: "send",
        chain: "base-sepolia",
        create: (wallet, signer) => wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true, signer }),
        sentSigner: (api) => api.send.mock.calls[0][2].signer,
    },
    {
        name: "EVM sendTransaction",
        chain: "base-sepolia",
        create: (wallet, signer) =>
            EVMWallet.from(wallet).sendTransaction({
                to: RECIPIENT,
                value: 1n,
                options: { prepareOnly: true, signer },
            }),
        sentSigner: createdSigner,
    },
    {
        name: "Solana sendTransaction",
        chain: "solana",
        create: (wallet, signer) =>
            SolanaWallet.from(wallet).sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
                options: { prepareOnly: true, signer },
            }),
        sentSigner: createdSigner,
    },
    {
        name: "Stellar sendTransaction",
        chain: "stellar",
        create: (wallet, signer) =>
            StellarWallet.from(wallet).sendTransaction({
                contractId: STELLAR_CONTRACT,
                method: "transfer",
                args: {},
                options: { prepareOnly: true, signer },
            }),
        sentSigner: createdSigner,
    },
];

describe("acting signer sent with a new transaction", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        api = createMockApiClient();
        api.send.mockResolvedValue({ id: "txn-1" } as unknown as SendResponse);
        api.createTransaction.mockResolvedValue(CREATED);
        stubServerSignerResolution();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(SIGNER_PATHS)("$name", ({ chain, create, sentSigner }) => {
        let wallet: Wallet<Chain>;

        beforeEach(async () => {
            wallet = await createMockWallet(chain, api, "api-key");
        });

        describe("when no signer option is passed", () => {
            it("sends the active signer's locator", async () => {
                await create(wallet, undefined);

                expect(sentSigner(api)).toBe(wallet.signer?.locator());
            });
        });

        describe("when the signer option is a locator", () => {
            it("sends that locator as given", async () => {
                await create(wallet, EXPLICIT_LOCATOR);

                expect(sentSigner(api)).toBe(EXPLICIT_LOCATOR);
            });
        });

        describe("when the signer option is a server signer config", () => {
            it("sends the server signer's API locator", async () => {
                await create(wallet, SERVER_CONFIG);

                expect(sentSigner(api)).toBe(DERIVED_SERVER_LOCATOR);
            });
        });
    });

    // An external-wallet recovery method without onSign cannot become the active signer on its own.
    const WALLET_ADDRESSES: Record<string, string> = {
        "base-sepolia": RECIPIENT,
        solana: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        stellar: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
    };

    describe.each(SIGNER_PATHS)("$name with no active signer", ({ chain, create }) => {
        it("throws before calling the API, even with an explicit signer", async () => {
            const wallet = new Wallet(
                {
                    chain,
                    address: WALLET_ADDRESSES[chain],
                    recovery: { type: "external-wallet", address: "RecoveryAddress123" },
                },
                api as unknown as ApiClient
            );
            await wallet.waitForInit();

            await expect(create(wallet, EXPLICIT_LOCATOR)).rejects.toThrow(/No signer is set/);
            expect(api.send).not.toHaveBeenCalled();
            expect(api.createTransaction).not.toHaveBeenCalled();
        });
    });
});

describe("Stellar upgrade and migrate signer", () => {
    let api: MockedApiClient;
    let stellarWallet: StellarWallet;

    beforeEach(async () => {
        vi.clearAllMocks();
        api = createMockApiClient();
        api.createTransaction.mockResolvedValue(CREATED);
        stellarWallet = StellarWallet.from(await createMockWallet("stellar", api, "api-key"));
        stubServerSignerResolution();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("when no signer option is passed", () => {
        it("sends no signer, so the API uses the admin signer", async () => {
            await stellarWallet.migrate({ prepareOnly: true });

            expect(api.createTransaction.mock.calls[0][1].params).toEqual({ transaction: { type: "migrate-wallet" } });
        });
    });

    describe.each([
        { kind: "a locator", option: EXPLICIT_LOCATOR, expected: EXPLICIT_LOCATOR },
        { kind: "a server signer config", option: SERVER_CONFIG, expected: DERIVED_SERVER_LOCATOR },
    ])("when the signer option is $kind", ({ option, expected }) => {
        it("sends the resolved signer", async () => {
            await stellarWallet.migrate({ prepareOnly: true, signer: option });

            expect(createdSigner(api)).toBe(expected);
        });
    });
});
