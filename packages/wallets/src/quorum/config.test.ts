import { describe, expect, it } from "vitest";
import type { QuorumSignerConfig } from "../signers/types";
import { InvalidRecoveryConfigError } from "../utils/errors";
import { toQuorumSignerInput } from "./config";

const DERIVATION = { chain: "base-sepolia", projectId: "project", environment: "staging" } as const;
const MEMBER = { type: "external-wallet", address: "0x1234567890123456789012345678901234567890" };

// Plain JavaScript callers can pass configs TypeScript would reject.
function untypedQuorum(config: object): QuorumSignerConfig<"base-sepolia"> {
    return { type: "quorum", threshold: 1, ...config } as unknown as QuorumSignerConfig<"base-sepolia">;
}

describe("toQuorumSignerInput", () => {
    it.each(["api-key", "device", "quorum", "foo"])("rejects a %s member instead of sending null", (type) => {
        const config = untypedQuorum({ members: [{ type }, MEMBER] });

        expect(() => toQuorumSignerInput(config, DERIVATION)).toThrow(InvalidRecoveryConfigError);
        expect(() => toQuorumSignerInput(config, DERIVATION)).toThrow(`A quorum member of type "${type}"`);
    });

    it("rejects a null member", () => {
        const config = untypedQuorum({ members: [null, MEMBER] });

        expect(() => toQuorumSignerInput(config, DERIVATION)).toThrow(InvalidRecoveryConfigError);
    });

    it.each([
        ["missing", {}],
        ["null", { members: null }],
    ])("rejects a %s members list with an SDK error", (_label, config) => {
        expect(() => toQuorumSignerInput(untypedQuorum(config), DERIVATION)).toThrow(
            new InvalidRecoveryConfigError("A quorum needs a `members` list.")
        );
    });

    it("maps supported members to their identity fields", () => {
        const config = untypedQuorum({ members: [{ ...MEMBER, onSign: () => "0x" }] });

        expect(toQuorumSignerInput(config, DERIVATION)).toEqual({ type: "quorum", threshold: 1, members: [MEMBER] });
    });
});
