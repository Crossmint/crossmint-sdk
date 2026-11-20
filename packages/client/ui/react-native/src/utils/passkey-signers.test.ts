import { describe, expect, it } from "vitest";
import { includesPasskeySigner } from "./passkey-signers";

const PASSKEY = { type: "passkey", id: "credential-id" };
const EXTERNAL_WALLET = { type: "external-wallet", address: "GABC" };

describe("includesPasskeySigner", () => {
    it("finds a top-level passkey", () => {
        expect(includesPasskeySigner([EXTERNAL_WALLET, PASSKEY])).toBe(true);
    });

    it("finds a passkey that is a member of a quorum", () => {
        expect(includesPasskeySigner([{ type: "quorum", members: [PASSKEY, EXTERNAL_WALLET] }])).toBe(true);
    });

    it("finds no passkey when no signer or member is one", () => {
        expect(includesPasskeySigner([EXTERNAL_WALLET, { type: "quorum", members: [EXTERNAL_WALLET] }])).toBe(false);
        expect(includesPasskeySigner(undefined)).toBe(false);
    });
});
