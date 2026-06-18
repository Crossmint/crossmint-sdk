import { expect, it, vi } from "vitest";
import type { Crossmint } from "@crossmint/common-sdk-base";
import type { EVMChain } from "../../chains/chains";
import type { DeviceSignerKeyStorage } from "../../utils/device-signers/DeviceSignerKeyStorage";
import type { ServerSignerResolver } from "../server/resolver";
import type { ApiSourcedServerSignerConfig, ServerSignerConfig, SignerConfigForChain } from "../types";
import { getSignerDescriptor } from "./index";
import type { SignerDescriptorContext } from "./types";

const CHAIN: EVMChain = "base-sepolia";
const WALLET_ADDRESS = "0xWalletAddress";
const crossmint = { sentinel: "crossmint" } as unknown as Crossmint;
const clientTEEConnection = { sentinel: "tee" } as SignerDescriptorContext<EVMChain>["clientTEEConnection"];
const onAuthRequired = vi.fn() as unknown as SignerDescriptorContext<EVMChain>["onAuthRequired"];
const SERVER_KEY_MATERIAL = { derivedKeyBytes: new Uint8Array([1, 2, 3]), derivedAddress: "0xDerivedServer" };

type Config = SignerConfigForChain<EVMChain> | ApiSourcedServerSignerConfig;
const cfg = (c: object) => c as unknown as Config;

function makeCtx(
    overrides: {
        deviceSignerKeyStorage?: DeviceSignerKeyStorage;
        hasRecoveryResolution?: boolean;
        apiLocator?: ServerSignerResolver["apiLocator"];
        candidateAddresses?: ServerSignerResolver["candidateAddresses"];
    } = {}
): SignerDescriptorContext<EVMChain> {
    return {
        chain: CHAIN,
        walletAddress: WALLET_ADDRESS,
        crossmint,
        clientTEEConnection,
        onAuthRequired,
        deviceSignerKeyStorage: overrides.deviceSignerKeyStorage,
        serverSigners: {
            keyMaterialForAssembly: vi.fn(() => SERVER_KEY_MATERIAL),
            hasRecoveryResolution: overrides.hasRecoveryResolution ?? false,
            apiLocator: overrides.apiLocator ?? vi.fn(() => "server:0xDerivedServer"),
            candidateAddresses: overrides.candidateAddresses ?? vi.fn(() => []),
        } as unknown as ServerSignerResolver,
    };
}

it.each<[name: string, type: string, config: Config, message: string]>([
    ["email missing email", "email", cfg({ type: "email" }), "Email signer requires an email address"],
    ["phone missing phone", "phone", cfg({ type: "phone" }), "Phone signer requires a phone number"],
    [
        "ext missing address",
        "external-wallet",
        cfg({ type: "external-wallet", onSign: vi.fn() }),
        "External wallet signer requires a wallet address",
    ],
    [
        "ext missing onSign",
        "external-wallet",
        cfg({ type: "external-wallet", address: "0xabc" }),
        "External wallet signer requires an onSign callback",
    ],
])("validateConfig: %s throws", (_name, type, config, message) => {
    expect(() => getSignerDescriptor(type as never).validateConfig(config as never)).toThrow(message);
});

it.each<[type: string, config: Config]>([
    ["email", cfg({ type: "email", email: "a@b.com" })],
    ["phone", cfg({ type: "phone", phone: "+15551234" })],
    ["external-wallet", cfg({ type: "external-wallet", address: "0xabc", onSign: vi.fn() })],
    ["api-key", cfg({ type: "api-key" })],
    ["passkey", cfg({ type: "passkey" })],
    ["device", cfg({ type: "device" })],
    ["server", cfg({ type: "server", secret: "s" })],
])("validateConfig: %s valid config is a no-op", (type, config) => {
    expect(() => getSignerDescriptor(type as never).validateConfig(config as never)).not.toThrow();
});

it.each<[type: "email" | "phone", field: "email" | "phone", value: string]>([
    ["email", "email", "a@b.com"],
    ["phone", "phone", "+15551234"],
])("buildInternalConfig: %s threads crossmint/clientTEEConnection/onAuthRequired from ctx", (type, field, value) => {
    const result = getSignerDescriptor(type).buildInternalConfig({ type, [field]: value } as never, makeCtx());
    expect(result).toEqual({
        type,
        [field]: value,
        locator: `${type}:${value}`,
        address: WALLET_ADDRESS,
        crossmint,
        clientTEEConnection,
        onAuthRequired,
    });
});

it("buildInternalConfig: api-key returns locator and wallet address", () => {
    const result = getSignerDescriptor("api-key").buildInternalConfig({ type: "api-key" } as never, makeCtx());
    expect(result).toEqual({ type: "api-key", locator: "api-key", address: WALLET_ADDRESS });
});

it("buildInternalConfig: external-wallet spreads config and derives locator from address", () => {
    const onSign = vi.fn();
    const result = getSignerDescriptor("external-wallet").buildInternalConfig(
        { type: "external-wallet", address: "0xabc", onSign } as never,
        makeCtx()
    );
    expect(result).toEqual({ type: "external-wallet", address: "0xabc", onSign, locator: "external-wallet:0xabc" });
});

it("buildInternalConfig: server uses keyMaterialForAssembly result", () => {
    const ctx = makeCtx();
    const config = { type: "server", secret: "s" } as ServerSignerConfig;
    const result = getSignerDescriptor("server").buildInternalConfig(config as never, ctx);
    expect(ctx.serverSigners.keyMaterialForAssembly).toHaveBeenCalledWith(config);
    expect(result).toEqual({
        type: "server",
        derivedKeyBytes: SERVER_KEY_MATERIAL.derivedKeyBytes,
        locator: "server:0xDerivedServer",
        address: "0xDerivedServer",
    });
});

it.each<[name: string, locator: string | undefined, expected: string | undefined]>([
    ["locator set", "device:pubkey", "device:pubkey"],
    ["locator undefined", undefined, undefined],
])("buildInternalConfig: device passes through %s", (_name, locator, expected) => {
    const result = getSignerDescriptor("device").buildInternalConfig({ type: "device", locator } as never, makeCtx());
    expect(result).toEqual({ type: "device", locator: expected, address: WALLET_ADDRESS });
});

const publicKey = { x: "1", y: "2" };
it.each<[name: string, config: Config, expected: object]>([
    [
        "missing id falls back to empty string with name/publicKey",
        cfg({ type: "passkey", name: "my-key", publicKey }),
        { type: "passkey", id: "", locator: "passkey:", name: "my-key", publicKey },
    ],
    [
        "provided id is kept",
        cfg({ type: "passkey", id: "cred-1" }),
        { type: "passkey", id: "cred-1", locator: "passkey:cred-1" },
    ],
])("buildInternalConfig: passkey %s", (_name, config, expected) => {
    expect(getSignerDescriptor("passkey").buildInternalConfig(config as never, makeCtx())).toMatchObject(expected);
});

it.each<[type: string]>([["email"], ["phone"], ["passkey"], ["api-key"]])(
    "canAutoAssemble: %s is always true",
    (type) => {
        expect(getSignerDescriptor(type as never).canAutoAssemble({ type } as never, makeCtx())).toBe(true);
    }
);

it.each<[name: string, storage: DeviceSignerKeyStorage | undefined, expected: boolean]>([
    ["with storage", {} as DeviceSignerKeyStorage, true],
    ["without storage", undefined, false],
])("canAutoAssemble: device %s", (_name, storage, expected) => {
    const ctx = makeCtx({ deviceSignerKeyStorage: storage });
    expect(getSignerDescriptor("device").canAutoAssemble({ type: "device" } as never, ctx)).toBe(expected);
});

it.each<[name: string, config: Config, expected: boolean]>([
    ["with onSign", cfg({ type: "external-wallet", address: "0xabc", onSign: vi.fn() }), true],
    ["without onSign", cfg({ type: "external-wallet", address: "0xabc" }), false],
])("canAutoAssemble: external-wallet %s", (_name, config, expected) => {
    expect(getSignerDescriptor("external-wallet").canAutoAssemble(config as never, makeCtx())).toBe(expected);
});

it.each<[name: string, config: Config, hasRecoveryResolution: boolean, expected: boolean]>([
    ["full config", cfg({ type: "server", secret: "s" }), false, true],
    ["api-sourced without recovery resolution", cfg({ type: "server", address: "0xabc" }), false, false],
    ["api-sourced with recovery resolution", cfg({ type: "server", address: "0xabc" }), true, true],
])("canAutoAssemble: server %s", (_name, config, hasRecoveryResolution, expected) => {
    const ctx = makeCtx({ hasRecoveryResolution });
    expect(getSignerDescriptor("server").canAutoAssemble(config as never, ctx)).toBe(expected);
});

it("addSignerPayload: passkey returns the full config", () => {
    const config = cfg({ type: "passkey", id: "cred-1", publicKey });
    expect(getSignerDescriptor("passkey").addSignerPayload(config as never, makeCtx())).toBe(config);
});

it("addSignerPayload: device with publicKey returns type/publicKey/name", () => {
    const config = cfg({ type: "device", publicKey, name: "my-device" });
    expect(getSignerDescriptor("device").addSignerPayload(config as never, makeCtx())).toEqual({
        type: "device",
        publicKey,
        name: "my-device",
    });
});

it("addSignerPayload: device without publicKey returns locator", () => {
    const config = cfg({ type: "device", locator: "device:pubkey" });
    expect(getSignerDescriptor("device").addSignerPayload(config as never, makeCtx())).toBe("device:pubkey");
});

it.each<[type: string, config: Config, expected: string]>([
    ["email", cfg({ type: "email", email: "a@b.com" }), "email:a@b.com"],
    ["phone", cfg({ type: "phone", phone: "+15551234" }), "phone:+15551234"],
    ["api-key", cfg({ type: "api-key" }), "api-key"],
    ["external-wallet", cfg({ type: "external-wallet", address: "0xabc", onSign: vi.fn() }), "external-wallet:0xabc"],
])("addSignerPayload: %s returns locator", (type, config, expected) => {
    expect(getSignerDescriptor(type as never).addSignerPayload(config as never, makeCtx())).toBe(expected);
});

it("addSignerPayload: server returns serverSigners.apiLocator", () => {
    const apiLocator = vi.fn(() => "server:0xResolved" as never);
    const config = cfg({ type: "server", secret: "s" });
    const ctx = makeCtx({ apiLocator });
    expect(getSignerDescriptor("server").addSignerPayload(config as never, ctx)).toBe("server:0xResolved");
    expect(apiLocator).toHaveBeenCalledWith(config);
});

it("matchesRecovery: device is always false", () => {
    expect(
        getSignerDescriptor("device").matchesRecovery(
            cfg({ type: "device" }) as never,
            cfg({ type: "device" }) as never,
            makeCtx()
        )
    ).toBe(false);
});

it("matchesRecovery: passkey is true even with differing ids", () => {
    expect(
        getSignerDescriptor("passkey").matchesRecovery(
            cfg({ type: "passkey", id: "cred-1" }) as never,
            cfg({ type: "passkey" }) as never,
            makeCtx()
        )
    ).toBe(true);
});

it.each<[name: string, signerAddrs: string[], recoveryAddrs: string[], expected: boolean]>([
    ["intersecting addresses", ["0xa", "0xb"], ["0xb"], true],
    ["disjoint addresses", ["0xa"], ["0xb"], false],
])("matchesRecovery: server %s", (_name, signerAddrs, recoveryAddrs, expected) => {
    const candidateAddresses = vi
        .fn()
        .mockReturnValueOnce(signerAddrs)
        .mockReturnValueOnce(recoveryAddrs) as unknown as ServerSignerResolver["candidateAddresses"];
    const ctx = makeCtx({ candidateAddresses });
    expect(
        getSignerDescriptor("server").matchesRecovery(
            cfg({ type: "server", secret: "s" }) as never,
            cfg({ type: "server", address: "0xb" }) as never,
            ctx
        )
    ).toBe(expected);
});

it.each<[name: string, type: string, config: Config, recovery: Config, expected: boolean]>([
    ["email match", "email", cfg({ type: "email", email: "a@b.com" }), cfg({ type: "email", email: "a@b.com" }), true],
    [
        "email mismatch",
        "email",
        cfg({ type: "email", email: "a@b.com" }),
        cfg({ type: "email", email: "c@d.com" }),
        false,
    ],
    ["phone match", "phone", cfg({ type: "phone", phone: "+1" }), cfg({ type: "phone", phone: "+1" }), true],
    ["phone mismatch", "phone", cfg({ type: "phone", phone: "+1" }), cfg({ type: "phone", phone: "+2" }), false],
    ["api-key match", "api-key", cfg({ type: "api-key" }), cfg({ type: "api-key" }), true],
    [
        "external-wallet match",
        "external-wallet",
        cfg({ type: "external-wallet", address: "0xabc", onSign: vi.fn() }),
        cfg({ type: "external-wallet", address: "0xabc" }),
        true,
    ],
    [
        "external-wallet mismatch",
        "external-wallet",
        cfg({ type: "external-wallet", address: "0xabc", onSign: vi.fn() }),
        cfg({ type: "external-wallet", address: "0xdef" }),
        false,
    ],
])("matchesRecovery: %s by locator equality", (_name, type, config, recovery, expected) => {
    expect(getSignerDescriptor(type as never).matchesRecovery(config as never, recovery as never, makeCtx())).toBe(
        expected
    );
});

it.each([
    ["email", true],
    ["phone", true],
    ["api-key", true],
    ["device", true],
    ["external-wallet", true],
    ["server", true],
    ["passkey", false],
] as const)("adoptsRecoveryConfigOnMatch: %s -> %s", (type, expected) => {
    expect(getSignerDescriptor(type).adoptsRecoveryConfigOnMatch).toBe(expected);
});
