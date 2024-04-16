import { SignedLocator } from "@/types/nfts";

import { EVMBlockchain, EVMNFT } from "@crossmint/common-sdk-base";

import {
    EncryptedVerifiableCredential,
    VerifiableCredential,
    VerifiableCredentialType,
} from "../types/verifiableCredential";

export function parseLocator(locator: string): EVMNFT {
    const items = locator.split(":");
    const itemsLength = items.length;
    if (itemsLength < 2) {
        throw new Error(`Invalid locator format, expected <chain>:<contractAddress>:<tokenId>`);
    }

    return {
        chain: items[0] as EVMBlockchain,
        contractAddress: items[1],
        tokenId: items[2],
    };
}

export function parseSignedLocator(signedLocator: string): SignedLocator {
    const parts = signedLocator.split("||", 4);
    if (parts.length !== 4) {
        throw new Error("Invalid signed locator format");
    }
    const locator = parts[0];
    const date = parts[1];
    const nonce = parts[2];
    const payload = `${locator}||${date}||${nonce}`;
    const signature = parts[3];

    return {
        locator,
        date,
        nonce,
        payload,
        signature,
    };
}

export function getDidAddress(did: string) {
    const parts = did.split(":");
    if (parts.length < 2) {
        throw new Error("Issuer DID should be in the format did:{chain}:{address}");
    }
    return parts[2];
}

export function isEncryptedVerifiableCredential(
    credential: VerifiableCredentialType
): credential is EncryptedVerifiableCredential {
    return (
        (credential as EncryptedVerifiableCredential).id !== undefined &&
        (credential as EncryptedVerifiableCredential).payload !== undefined &&
        (credential as VerifiableCredential).credentialSubject === undefined
    );
}

export function isPolygon(chain: string): boolean {
    return chain.includes("poly");
}
