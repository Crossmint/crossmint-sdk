/**
 * CHARACTERIZATION (contract) tests for:
 *
 * 1. buildInternalSignerConfig email/phone auth wiring (wallet.ts ~lines 1893-1912):
 *    the internal signer config handed to assembleSigner must carry the apiClient's
 *    `crossmint` instance, the WalletOptions `clientTEEConnection`, and the
 *    `callbacks.onAuthRequired` callback BY REFERENCE, plus the derived locator
 *    ("email:<email>" / "phone:<phone>") and the wallet address.
 *
 * 2. useSigner({type:"device"}) success paths (wallet.ts useSigner ~1056-1065 +
 *    resolveDeviceSignerAvailability ~1813-1843):
 *    (a) key storage hit by wallet address → locator "device:<key>"
 *    (b) key storage miss but registered device signer key exists locally →
 *        mapAddressToKey + adopt that signer's locator
 *    (c) no key anywhere → needsRecovery() true YET a device signer is still
 *        assembled and assigned (deliberately asymmetric with initDeviceSigner).
 *
 * These tests pin CURRENT behavior ahead of the wallet.ts service decomposition.
 * Do not "fix" behavior here — if a refactor changes observable behavior, these
 * tests are supposed to fail.
 *
 * assembleSigner (src/signers/index.ts) is mocked with a reflective adapter so the
 * exact internal config wallet.ts builds is captured without pulling in TEE/iframe
 * machinery from the real NonCustodialSigner.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "../../wallet";
import type { ApiClient } from "../../../api";
import { walletsLogger } from "../../../logger";
import { assembleSigner } from "../../../signers";
import { createMockApiClient, type MockedApiClient } from "../test-helpers";

// Reflective assembleSigner mock: returns an adapter whose locator() echoes the
// internal config's locator, so assertions read exactly what wallet.ts built.
vi.mock("../../../signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../signers")>();
    return {
        ...actual,
        assembleSigner: vi.fn((_chain: unknown, config: { type: string; locator?: string }) => ({
            type: config.type,
            locator: () => config.locator,
            status: undefined as string | undefined,
            signMessage: vi.fn(),
            signTransaction: vi.fn(),
        })),
    };
});

const mockedAssembleSigner = vi.mocked(assembleSigner);

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";

// Sentinels asserted by reference identity (toBe) — propagation must not clone/transform them.
const SENTINEL_CROSSMINT = { __sentinel: "crossmint-instance" } as const;
const SENTINEL_TEE_CONNECTION = { __sentinel: "client-tee-connection" } as const;

// Same shape as device-init-and-recovery.contract.test.ts's storage mock.
const createMockDeviceKeyStorage = () => ({
    generateKey: vi.fn().mockResolvedValue("mockPublicKeyBase64"),
    getKey: vi.fn().mockResolvedValue(null),
    hasKey: vi.fn().mockResolvedValue(false),
    mapAddressToKey: vi.fn().mockResolvedValue(undefined),
    deleteKey: vi.fn().mockResolvedValue(undefined),
    signMessage: vi.fn().mockResolvedValue({ r: "0x1", s: "0x2" }),
    getDeviceName: vi.fn().mockReturnValue("Test Device"),
    apiKey: "test-api-key",
});

// Approved EVM device-signer response so assembleFullSigner's getSignerState
// resolves a "success" status (keeps initDeviceSigner from flagging recovery).
const approvedDeviceSignerResponse = (locator: string) =>
    ({
        type: "device",
        locator,
        publicKey: { x: "1", y: "2" },
        chains: { "base-sepolia": { status: "success" } },
    }) as any;

describe("contract: signer-wiring-and-device-usesigner", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        (mockApiClient as any).crossmint = SENTINEL_CROSSMINT;
    });

    describe("buildInternalSignerConfig email/phone auth wiring (FINDING 1)", () => {
        const buildWalletWithAuthOptions = () => {
            const onAuthRequired = vi.fn();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: {
                        clientTEEConnection: SENTINEL_TEE_CONNECTION as any,
                        callbacks: { onAuthRequired },
                    },
                },
                mockApiClient as unknown as ApiClient
            );
            return { wallet, onAuthRequired };
        };

        // pins wallet.ts buildInternalSignerConfig case "email": crossmint/clientTEEConnection/onAuthRequired + locator + address propagation into assembleSigner
        it("useSigner email: passes crossmint, clientTEEConnection and onAuthRequired by reference, with locator 'email:a@b.com' and the wallet address", async () => {
            const { wallet, onAuthRequired } = buildWalletWithAuthOptions();
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "email", email: "a@b.com", address: EVM_ADDRESS, locator: "email:a@b.com", status: "success" },
            ] as any);
            mockedAssembleSigner.mockClear();
            mockApiClient.getSigner.mockClear();

            await wallet.useSigner({ type: "email", email: "a@b.com" } as any);

            expect(mockedAssembleSigner).toHaveBeenCalledTimes(1);
            const [chainArg, internalConfig, storageArg] = mockedAssembleSigner.mock.calls[0] as any[];
            expect(chainArg).toBe("base-sepolia");
            expect(internalConfig.type).toBe("email");
            expect(internalConfig.email).toBe("a@b.com");
            expect(internalConfig.locator).toBe("email:a@b.com");
            expect(internalConfig.address).toBe(EVM_ADDRESS);
            // The three auth-wiring fields arrive intact, by reference:
            expect(internalConfig.crossmint).toBe(SENTINEL_CROSSMINT);
            expect(internalConfig.clientTEEConnection).toBe(SENTINEL_TEE_CONNECTION);
            expect(internalConfig.onAuthRequired).toBe(onAuthRequired);
            // No device key storage configured → assembleSigner's third arg is undefined
            expect(storageArg).toBeUndefined();

            // Registered (non-admin) signer → status is fetched via getSigner with the client-side wallet locator
            expect(mockApiClient.getSigner).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "email:a@b.com");
            expect(wallet.signer?.locator()).toBe("email:a@b.com");
            // getSigner mock resolved undefined → getSignerState yields null signer → status stays undefined
            expect(wallet.signer?.status).toBeUndefined();
            expect(wallet.needsRecovery()).toBe(false);
        });

        // pins wallet.ts buildInternalSignerConfig case "phone": crossmint/clientTEEConnection/onAuthRequired + locator + address propagation into assembleSigner
        it("useSigner phone: passes crossmint, clientTEEConnection and onAuthRequired by reference, with locator 'phone:+15555550100' and the wallet address", async () => {
            const { wallet, onAuthRequired } = buildWalletWithAuthOptions();
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([
                {
                    type: "phone",
                    phone: "+15555550100",
                    address: EVM_ADDRESS,
                    locator: "phone:+15555550100",
                    status: "success",
                },
            ] as any);
            mockedAssembleSigner.mockClear();
            mockApiClient.getSigner.mockClear();

            await wallet.useSigner({ type: "phone", phone: "+15555550100" } as any);

            expect(mockedAssembleSigner).toHaveBeenCalledTimes(1);
            const [chainArg, internalConfig, storageArg] = mockedAssembleSigner.mock.calls[0] as any[];
            expect(chainArg).toBe("base-sepolia");
            expect(internalConfig.type).toBe("phone");
            expect(internalConfig.phone).toBe("+15555550100");
            expect(internalConfig.locator).toBe("phone:+15555550100");
            expect(internalConfig.address).toBe(EVM_ADDRESS);
            expect(internalConfig.crossmint).toBe(SENTINEL_CROSSMINT);
            expect(internalConfig.clientTEEConnection).toBe(SENTINEL_TEE_CONNECTION);
            expect(internalConfig.onAuthRequired).toBe(onAuthRequired);
            expect(storageArg).toBeUndefined();

            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "phone:+15555550100");
            expect(wallet.signer?.locator()).toBe("phone:+15555550100");
            expect(wallet.needsRecovery()).toBe(false);
        });
    });

    describe("useSigner({type:'device'}) resolution (FINDING 2)", () => {
        // (a) pins wallet.ts resolveDeviceSignerAvailability getKey-hit branch: locator becomes "device:<key>", no signers()/mapAddressToKey, storage forwarded to assembleSigner
        it("adopts 'device:<key>' from key storage getKey(walletAddress) and assembles via the options key storage", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.getKey.mockResolvedValue("existingDeviceKeyB64");
            mockApiClient.getSigner.mockResolvedValue(approvedDeviceSignerResponse("device:existingDeviceKeyB64"));

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            await wallet.waitForInit();
            mockedAssembleSigner.mockClear();
            mockStorage.getKey.mockClear();
            mockApiClient.getSigner.mockClear();
            mockApiClient.getWallet.mockClear();

            const deviceConfig = { type: "device" } as any;
            await wallet.useSigner(deviceConfig);

            // Key storage hit short-circuits: no signers() lookup, no address→key mapping
            expect(mockStorage.getKey).toHaveBeenCalledWith(EVM_ADDRESS);
            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
            expect(mockStorage.mapAddressToKey).not.toHaveBeenCalled();

            expect(mockedAssembleSigner).toHaveBeenCalledTimes(1);
            const [chainArg, internalConfig, storageArg] = mockedAssembleSigner.mock.calls[0] as any[];
            expect(chainArg).toBe("base-sepolia");
            expect(internalConfig).toMatchObject({
                type: "device",
                locator: "device:existingDeviceKeyB64",
                address: EVM_ADDRESS,
            });
            // useSigner passes undefined storage to assembleFullSigner; the default
            // parameter resolves it back to options.deviceSignerKeyStorage
            expect(storageArg).toBe(mockStorage);

            expect(wallet.signer?.locator()).toBe("device:existingDeviceKeyB64");
            expect(wallet.signer?.status).toBe("success");
            expect(wallet.needsRecovery()).toBe(false);
            // The CALLER's config object is mutated in place with the resolved locator
            expect(deviceConfig.locator).toBe("device:existingDeviceKeyB64");
            expect(walletsLogger.info).toHaveBeenCalledWith("wallet.useSigner.success", {
                signerLocator: "device:existingDeviceKeyB64",
            });
        });

        // (b) pins wallet.ts resolveDeviceSignerAvailability registered-signer fallback: hasKey match → mapAddressToKey(address, pub) + adopt "device:<pub>"
        it("falls back to a registered device signer whose key exists locally: maps address to key and adopts that locator", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.getKey.mockResolvedValue(null);
            mockStorage.hasKey.mockImplementation(async (key: string) => key === "pubKeyFromApi");
            mockApiClient.getSigner.mockResolvedValue(approvedDeviceSignerResponse("device:pubKeyFromApi"));

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            // Installed synchronously before init's first await resumes — init and
            // useSigner both see this registered device signer.
            const signersSpy = vi.spyOn(wallet, "signers").mockResolvedValue([
                {
                    type: "device",
                    locator: "device:pubKeyFromApi",
                    publicKey: { x: "1", y: "2" },
                    status: "success",
                },
            ] as any);
            await wallet.waitForInit();
            mockedAssembleSigner.mockClear();
            mockStorage.hasKey.mockClear();
            mockStorage.mapAddressToKey.mockClear();
            signersSpy.mockClear();

            await wallet.useSigner({ type: "device" } as any);

            expect(signersSpy).toHaveBeenCalledTimes(1);
            expect(mockStorage.hasKey).toHaveBeenCalledWith("pubKeyFromApi");
            expect(mockStorage.mapAddressToKey).toHaveBeenCalledTimes(1);
            expect(mockStorage.mapAddressToKey).toHaveBeenCalledWith(EVM_ADDRESS, "pubKeyFromApi");

            expect(mockedAssembleSigner).toHaveBeenCalledTimes(1);
            const [, internalConfig, storageArg] = mockedAssembleSigner.mock.calls[0] as any[];
            expect(internalConfig).toMatchObject({
                type: "device",
                locator: "device:pubKeyFromApi",
                address: EVM_ADDRESS,
            });
            expect(storageArg).toBe(mockStorage);

            expect(wallet.signer?.locator()).toBe("device:pubKeyFromApi");
            expect(wallet.needsRecovery()).toBe(false);
        });

        // (c) pins wallet.ts useSigner device no-key branch: needsRecovery=true YET a signer IS assembled and assigned — asymmetric with initDeviceSigner, which leaves it unassembled
        it("no key anywhere: flags needsRecovery but still assembles and assigns a device signer (initDeviceSigner leaves it unassembled)", async () => {
            const mockStorage = createMockDeviceKeyStorage(); // getKey → null, hasKey → false

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);
            await wallet.waitForInit();

            // initDeviceSigner side of the asymmetry: recovery flagged, signer NOT assembled
            expect(wallet.signer).toBeUndefined();
            expect(wallet.needsRecovery()).toBe(true);
            expect(mockedAssembleSigner).not.toHaveBeenCalled();

            await wallet.useSigner({ type: "device" } as any);

            // useSigner side: recovery still flagged, but a device signer IS assigned
            expect(wallet.needsRecovery()).toBe(true);
            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("device");
            expect(mockedAssembleSigner).toHaveBeenCalledTimes(1);
            const [, internalConfig, storageArg] = mockedAssembleSigner.mock.calls[0] as any[];
            expect(internalConfig.type).toBe("device");
            expect(internalConfig.locator).toBeUndefined(); // no key resolved → no locator
            expect(internalConfig.address).toBe(EVM_ADDRESS);
            expect(storageArg).toBe(mockStorage);
            // getSignerLocator falls back to the bare "device:" locator for logging
            expect(walletsLogger.info).toHaveBeenCalledWith("wallet.useSigner.success", {
                signerLocator: "device:",
            });
        });

        // pins wallet.ts resolveDeviceSignerAvailability success branches: they return without touching #needsRecovery, so a previously-set flag survives a successful key adoption
        it("a later successful device useSigner does NOT clear a previously-set needsRecovery flag", async () => {
            // NOTE: suspected bug — non-device useSigner paths reset #needsRecovery=false on
            // success, but the device key-found branches never clear it, leaving a stale flag.
            const mockStorage = createMockDeviceKeyStorage(); // getKey → null at init

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);
            await wallet.waitForInit();
            expect(wallet.needsRecovery()).toBe(true);

            // A device key materializes locally (e.g. generated elsewhere) before useSigner
            mockStorage.getKey.mockResolvedValue("lateLocalKey");
            mockApiClient.getSigner.mockResolvedValue(approvedDeviceSignerResponse("device:lateLocalKey"));
            mockedAssembleSigner.mockClear();

            await wallet.useSigner({ type: "device" } as any);

            // The signer is fully adopted...
            expect(wallet.signer?.locator()).toBe("device:lateLocalKey");
            expect(wallet.signer?.status).toBe("success");
            // ...yet the stale recovery flag is NOT cleared
            expect(wallet.needsRecovery()).toBe(true);
        });
    });
});
