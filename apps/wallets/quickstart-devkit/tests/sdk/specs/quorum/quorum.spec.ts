import { test, expect } from "@playwright/test";
import { CrossmintWallets, EVMWallet, createCrossmint } from "@crossmint/wallets-sdk";
import { Keypair as StellarKeypair } from "@stellar/stellar-sdk";
import { createPublicClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
    AUTH_CONFIG,
    TEST_RECIPIENT_WALLET_ADDRESSES,
    validateAPITestConfig,
} from "../../../shared/constants/globalConstants";
import { MockDeviceSignerKeyStorage } from "../../helpers/mock-device-storage";

// Live quorum flows on staging: EVM needs `release_evmQuorumSigner` on for the API key's project; Stellar needs nothing.
const API_KEY = AUTH_CONFIG.crossmintApiKey;

function makeSdk() {
    return CrossmintWallets.from(createCrossmint({ apiKey: API_KEY }));
}

// One person's key: an external wallet whose private key the test holds, so it signs like a real member.
function evmMember() {
    const account = privateKeyToAccount(generatePrivateKey());
    return {
        type: "external-wallet" as const,
        address: account.address,
        onSign: async (payload: string) => account.signMessage({ message: { raw: payload as `0x${string}` } }),
    };
}

function stellarMember() {
    const keypair = StellarKeypair.random();
    return {
        type: "external-wallet" as const,
        address: keypair.publicKey(),
        onSign: async (payload: string) => keypair.sign(Buffer.from(payload, "base64")).toString("base64"),
    };
}

// The request a quorum-approved call returned, as approve() takes it.
function requestOf(result: { transactionId?: string; signatureId?: string } | undefined) {
    if (result?.signatureId != null) {
        return { signatureId: result.signatureId };
    }
    if (result?.transactionId != null) {
        return { transactionId: result.transactionId };
    }
    throw new Error(`Expected a request for quorum members to approve, got ${JSON.stringify(result)}`);
}

const CHAINS = [
    { chain: "base-sepolia" as const, member: evmMember, recipient: TEST_RECIPIENT_WALLET_ADDRESSES.evm },
    { chain: "stellar" as const, member: stellarMember, recipient: TEST_RECIPIENT_WALLET_ADDRESSES.stellar },
];

for (const { chain, member, recipient } of CHAINS) {
    test.describe(`Quorum on ${chain} — SDK`, { tag: "@quorum" }, () => {
        test.beforeAll(() => {
            validateAPITestConfig();
        });

        test("creates a wallet whose recovery method is a 2-of-3 quorum", async () => {
            const members = [member(), member(), member()];

            const wallet = await makeSdk().createWallet({
                chain,
                recoveryMethods: [{ type: "quorum", threshold: 2, members }],
                owner: `userId:sdk-quorum-create-${chain}-${Date.now()}`,
            });

            const [recovery] = wallet.recoveryMethods;
            expect(recovery).toMatchObject({ type: "quorum", threshold: 2 });
            expect((recovery as { locator: string }).locator).toMatch(/^quorum:[0-9a-f-]{36}$/);
            expect((recovery as { members: Array<{ locator: string }> }).members.map((m) => m.locator)).toEqual(
                members.map((m) => `external-wallet:${m.address}`)
            );
        });

        test("adds a delegated quorum the recovery quorum approves, then sends as it with two members", async () => {
            const [alice, bob, carol] = [member(), member(), member()];
            const [dave, erin, frank] = [member(), member(), member()];
            const wallet = await makeSdk().createWallet({
                chain,
                recoveryMethods: [{ type: "quorum", threshold: 2, members: [alice, bob, carol] }],
                owner: `userId:sdk-quorum-delegated-${chain}-${Date.now()}`,
            });

            // Alice creates the change; it is unsigned until two recovery members approve.
            await wallet.useRecoveryMethod(alice);
            const added = await wallet.addSigner(
                { type: "quorum", threshold: 2, members: [dave, erin, frank] },
                { prepareOnly: true }
            );
            expect(added.locator).toMatch(/^quorum:/);
            const addRequest = requestOf(added);
            await wallet.approve(addRequest);
            await wallet.useRecoveryMethod(bob);
            await wallet.approve(addRequest);

            await wallet.stagingFund(1);

            // Dave is only a member of the delegated quorum, so he acts as it; Erin's approval lands the send.
            await wallet.useSigner(dave);
            const sent = await wallet.send(recipient, "usdxm", "0.0001", { prepareOnly: true });
            expect(sent.hash).toBeUndefined();
            const first = await wallet.approve({ transactionId: sent.transactionId });
            expect(first.hash).toBeUndefined();
            await wallet.useSigner(erin);
            const landed = await wallet.approve({ transactionId: sent.transactionId });
            expect(landed.hash).toBeTruthy();
        });

        test("recovers a device key through the recovery quorum and removes the lost one once it lands", async () => {
            const [alice, bob, carol] = [member(), member(), member()];
            const storage = new SavedLocatorDeviceStorage(API_KEY);
            const sdk = makeSdk();
            const created = await sdk.createWallet({
                chain,
                recoveryMethods: [{ type: "quorum", threshold: 2, members: [alice, bob, carol] }],
                options: { deviceSignerKeyStorage: storage },
                owner: `userId:sdk-quorum-recovery-${chain}-${Date.now()}`,
            });
            const lostDevice = created.signer?.locator();
            expect(lostDevice).toMatch(/^device:/);

            // The device loses its key; the wallet keeps the old device signer until the quorum replaces it.
            await storage.deleteKey(created.address);
            const wallet = await sdk.getWallet(created.address, {
                chain,
                options: { deviceSignerKeyStorage: storage },
            });
            expect(wallet.needsRecovery()).toBe(true);

            await wallet.useRecoveryMethod(alice);
            const registration = requestOf(await wallet.recover());
            expect(await wallet.recover()).toEqual(registration);
            await wallet.approve(registration);
            await wallet.useRecoveryMethod(bob);
            await wallet.approve(registration);

            const removal = requestOf(await wallet.recover());
            expect(wallet.needsRecovery()).toBe(false);
            expect(wallet.signer?.locator()).not.toBe(lostDevice);
            await wallet.approve(removal);
            await wallet.useRecoveryMethod(alice);
            await wallet.approve(removal);

            const signers = await wallet.signers();
            expect(signers.map((signer) => signer.locator)).not.toContain(lostDevice);
        });
    });
}

test.describe("Quorum on base-sepolia — ERC-1271", { tag: "@quorum" }, () => {
    test.beforeAll(() => {
        validateAPITestConfig();
    });

    test("a delegated quorum's signature verifies on-chain", async () => {
        const [alice, bob, carol] = [evmMember(), evmMember(), evmMember()];
        const [dave, erin, frank] = [evmMember(), evmMember(), evmMember()];
        const wallet = await makeSdk().createWallet({
            chain: "base-sepolia",
            recoveryMethods: [{ type: "quorum", threshold: 2, members: [alice, bob, carol] }],
            owner: `userId:sdk-quorum-1271-${Date.now()}`,
        });
        await wallet.useRecoveryMethod(alice);
        const added = await wallet.addSigner(
            { type: "quorum", threshold: 2, members: [dave, erin, frank] },
            { prepareOnly: true }
        );
        const addRequest = requestOf(added);
        await wallet.approve(addRequest);
        await wallet.useRecoveryMethod(bob);
        await wallet.approve(addRequest);

        const message = `quorum e2e ${Date.now()}`;
        // EVMWallet.from copies the active key once, so a member must be active before the wrap.
        await wallet.useSigner(dave);
        const evmWallet = EVMWallet.from(wallet);
        const requested = await evmWallet.signMessage({
            message,
            options: { prepareOnly: true, signer: added.locator },
        });
        await wallet.approve({ signatureId: requested.signatureId });
        await wallet.useSigner(erin);
        const signed = await wallet.approve({ signatureId: requested.signatureId });

        const client = createPublicClient({ chain: baseSepolia, transport: http() });
        const valid = await client.verifyMessage({
            address: wallet.address as `0x${string}`,
            message,
            signature: (signed as { signature: `0x${string}` }).signature,
        });
        expect(valid).toBe(true);
    });
});

// The mock storage, plus the locator the SDK saves once a device signer is approved, so a re-registration on this
// device finds the signer it replaces.
class SavedLocatorDeviceStorage extends MockDeviceSignerKeyStorage {
    private readonly savedLocators = new Map<string, string>();

    async saveSignerLocator(address: string, signerLocator: string): Promise<void> {
        this.savedLocators.set(address, signerLocator);
    }

    async getSavedSignerLocator(address: string): Promise<string | null> {
        return this.savedLocators.get(address) ?? null;
    }
}
