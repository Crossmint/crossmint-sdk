import type { QuorumSignerInput } from "../api";
import type { Chain } from "../chains/chains";
import { deriveServerSignerDetails } from "../signers/server";
import {
    isApiSourcedServerSignerConfig,
    type QuorumMemberConfig,
    type QuorumSigner,
    type QuorumSignerConfig,
    type ServerSignerConfig,
    type SignerLocator,
} from "../signers/types";
import { secureWipe } from "../utils/secure-wipe";
import { getSignerLocator } from "../utils/signer-locator";
import { quorumsWithComposition } from "./members";

type QuorumMemberInput = QuorumSignerInput["members"][number];

/** Where a server member's secret derives its key: the wallet's chain, project and environment. */
export type ServerMemberDerivation = { chain: Chain; projectId: string; environment: string };

/** The API input for a quorum: each member's identity fields only, so `onSign` and `secret` stay on this client. */
export function toQuorumSignerInput(
    config: QuorumSignerConfig<Chain>,
    derivation: ServerMemberDerivation
): QuorumSignerInput {
    return {
        type: "quorum",
        threshold: config.threshold,
        members: config.members.map((member) => toQuorumMemberInput(member, derivation)),
    };
}

function toQuorumMemberInput(member: QuorumMemberConfig<Chain>, derivation: ServerMemberDerivation): QuorumMemberInput {
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
            return { type: "server", address: serverMemberAddress(member, derivation) };
        case "passkey":
            return { type: "passkey", id: member.id, name: member.name, publicKey: member.publicKey };
    }
}

// Members sign approvals with the primary derivation only (E1), so a member's address is always that one.
function serverMemberAddress(member: ServerSignerConfig, { chain, projectId, environment }: ServerMemberDerivation) {
    const { derivedAddress, derivedKeyBytes } = deriveServerSignerDetails(member, chain, projectId, environment);
    secureWipe(derivedKeyBytes);
    return derivedAddress;
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
