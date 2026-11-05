import type { QuorumSignerInput } from "../api";
import type { Chain } from "../chains/chains";
import {
    isApiSourcedServerSignerConfig,
    type QuorumMemberConfig,
    type QuorumSigner,
    type QuorumSignerConfig,
    type ServerSignerConfig,
    type SignerLocator,
} from "../signers/types";
import { getSignerLocator } from "../utils/signer-locator";
import { quorumsWithComposition } from "./members";

type QuorumMemberInput = QuorumSignerInput["members"][number];

/**
 * The API input for a quorum: each member's identity fields only, so `onSign` and `secret` stay on this client.
 * `serverAddress` derives the address of a server member given by its secret.
 */
export function toQuorumSignerInput(
    config: QuorumSignerConfig<Chain>,
    serverAddress: (config: ServerSignerConfig) => string
): QuorumSignerInput {
    return {
        type: "quorum",
        threshold: config.threshold,
        members: config.members.map((member) => toQuorumMemberInput(member, serverAddress)),
    };
}

function toQuorumMemberInput(
    member: QuorumMemberConfig<Chain>,
    serverAddress: (config: ServerSignerConfig) => string
): QuorumMemberInput {
    switch (member.type) {
        case "email":
            return { type: "email", email: member.email };
        case "phone":
            return { type: "phone", phone: member.phone };
        case "external-wallet":
            return { type: "external-wallet", address: member.address };
        case "server":
            if (isApiSourcedServerSignerConfig(member)) {
                return { type: "server", address: member.address };
            }
            return { type: "server", address: serverAddress(member) };
        case "passkey":
            return { type: "passkey", id: member.id, name: member.name, publicKey: member.publicKey };
    }
}

/** The quorums with the input's threshold and member set, members in any order. */
export function quorumsMatchingInput(quorums: QuorumSigner[], input: QuorumSignerInput): QuorumSigner[] {
    return quorumsWithComposition(quorums, input.threshold, input.members.map(memberInputLocator));
}

function memberInputLocator(member: QuorumMemberInput): SignerLocator {
    if (member.type === "server") {
        return `server:${member.address}`;
    }
    return getSignerLocator(member);
}
