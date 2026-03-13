import { describe, it, expect } from "vitest";
import base58 from "bs58";
import { MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";

import { deriveKeyBytes } from "../../utils/server-key-derivation";
import type { ServerInternalSignerConfig } from "../types";
import { EVMServerSigner } from "./evm-server-signer";
import { SolanaServerSigner } from "./solana-server-signer";
import { StellarServerSigner } from "./stellar-server-signer";
import { assembleServerSigner, deriveServerSignerAddress, deriveServerSignerDetails } from "./index";

const TEST_SECRET = "a".repeat(64);
const PROJECT_ID = "project-123";
const ENVIRONMENT = "staging";

function makeConfig(chain: string): ServerInternalSignerConfig {
    const derivedKeyBytes = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, chain);
    return {
        type: "server",
        derivedKeyBytes,
        locator: `server:test-locator-${chain}`,
        address: "test-address",
    };
}

describe("EVMServerSigner", () => {
    const config = makeConfig("base-sepolia");
    const signer = new EVMServerSigner(config);

    it("has type server", () => {
        expect(signer.type).toBe("server");
    });

    it("returns a valid EVM address", () => {
        const address = signer.address();
        expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("returns locator", () => {
        expect(signer.locator()).toBe("server:test-locator-base-sepolia");
    });

    it("signs a message and returns a signature", async () => {
        const message = "0xdeadbeef";
        const result = await signer.signMessage(message);
        expect(result.signature).toBeDefined();
        expect(typeof result.signature).toBe("string");
    });

    it("signTransaction delegates to signMessage", async () => {
        const tx = "0xdeadbeef";
        const msgResult = await signer.signMessage(tx);
        const txResult = await signer.signTransaction(tx);
        expect(txResult.signature).toBe(msgResult.signature);
    });
});

describe("SolanaServerSigner", () => {
    const config = makeConfig("solana");
    const signer = new SolanaServerSigner(config);

    it("has type server", () => {
        expect(signer.type).toBe("server");
    });

    it("returns a valid Solana address (base58)", () => {
        const address = signer.address();
        // Should be decodable as base58
        expect(() => base58.decode(address)).not.toThrow();
    });

    it("returns locator", () => {
        expect(signer.locator()).toBe("server:test-locator-solana");
    });

    it("signs a base58-encoded message", async () => {
        const messageBytes = new Uint8Array([1, 2, 3, 4]);
        const message = base58.encode(messageBytes);
        const result = await signer.signMessage(message);
        expect(result.signature).toBeDefined();
        // Signature should be decodable as base58
        expect(() => base58.decode(result.signature)).not.toThrow();
    });

    it("signTransaction deserializes and signs the transaction message", async () => {
        // Build a minimal VersionedTransaction
        const message = MessageV0.compile({
            payerKey: new PublicKey(signer.address()),
            instructions: [],
            recentBlockhash: PublicKey.default.toBase58(),
        });
        const tx = new VersionedTransaction(message);
        const serialized = base58.encode(tx.serialize());

        const result = await signer.signTransaction(serialized);
        expect(result.signature).toBeDefined();
        expect(() => base58.decode(result.signature)).not.toThrow();

        // Verify the signature is valid against the message bytes
        const sigBytes = base58.decode(result.signature);
        const messageBytes = tx.message.serialize();
        const pubkey = base58.decode(signer.address());
        expect(nacl.sign.detached.verify(messageBytes, sigBytes, pubkey)).toBe(true);
    });
});

describe("StellarServerSigner", () => {
    const config = makeConfig("stellar");
    const signer = new StellarServerSigner(config);

    it("has type server", () => {
        expect(signer.type).toBe("server");
    });

    it("returns a valid Stellar public key (starts with G)", () => {
        const address = signer.address();
        expect(address).toMatch(/^G[A-Z0-9]+$/);
    });

    it("returns locator", () => {
        expect(signer.locator()).toBe("server:test-locator-stellar");
    });

    it("signs a base64-encoded message", async () => {
        const messageBytes = Buffer.from([1, 2, 3, 4]);
        const message = messageBytes.toString("base64");
        const result = await signer.signMessage(message);
        expect(result.signature).toBeDefined();
        // Signature should be decodable as base64
        expect(() => Buffer.from(result.signature, "base64")).not.toThrow();
    });

    it("signTransaction delegates to signMessage", async () => {
        const message = Buffer.from([1, 2, 3]).toString("base64");
        const msgResult = await signer.signMessage(message);
        const txResult = await signer.signTransaction(message);
        expect(txResult.signature).toBe(msgResult.signature);
    });
});

describe("assembleServerSigner", () => {
    it("returns EVMServerSigner for EVM chains", () => {
        const signer = assembleServerSigner("base-sepolia", makeConfig("base-sepolia"));
        expect(signer).toBeInstanceOf(EVMServerSigner);
    });

    it("returns SolanaServerSigner for solana", () => {
        const signer = assembleServerSigner("solana", makeConfig("solana"));
        expect(signer).toBeInstanceOf(SolanaServerSigner);
    });

    it("returns StellarServerSigner for stellar", () => {
        const signer = assembleServerSigner("stellar", makeConfig("stellar"));
        expect(signer).toBeInstanceOf(StellarServerSigner);
    });
});

describe("deriveServerSignerAddress", () => {
    const keyBytes = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "base-sepolia");

    it("derives EVM address", () => {
        const address = deriveServerSignerAddress(keyBytes, "base-sepolia");
        expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("derives Solana address", () => {
        const solKeyBytes = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "solana");
        const address = deriveServerSignerAddress(solKeyBytes, "solana");
        expect(() => base58.decode(address)).not.toThrow();
    });

    it("derives Stellar address", () => {
        const stelKeyBytes = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "stellar");
        const address = deriveServerSignerAddress(stelKeyBytes, "stellar");
        expect(address).toMatch(/^G[A-Z0-9]+$/);
    });
});

describe("deriveServerSignerDetails", () => {
    it("returns derivedKeyBytes and derivedAddress", () => {
        const config = { type: "server" as const, secret: TEST_SECRET };
        const result = deriveServerSignerDetails(config, "base-sepolia", PROJECT_ID, ENVIRONMENT);

        expect(result.derivedKeyBytes).toBeInstanceOf(Uint8Array);
        expect(result.derivedKeyBytes.length).toBe(32);
        expect(result.derivedAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });
});
