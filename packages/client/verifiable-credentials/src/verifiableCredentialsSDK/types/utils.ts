import { VCChain } from "./chain";
import type { VCContractMetadata } from "./collection";
import type { Nft } from "./nft";
import type {
    EncryptedVerifiableCredential,
    VerifiableCredential,
    VerifiableCredentialType,
} from "./verifiableCredential";

/**
 * Parses a locator string and returns an NFT object.
 *
 * The locator is expected to be in the format `<chain>:<contractAddress>:<tokenId>`.
 *
 * @param locator - The locator string to parse.
 * @returns An `Nft` object containing `chain`, `contractAddress`, and `tokenId`.
 * @throws Will throw an error if the locator format is invalid.
 */
export function parseLocator(locator: string): Nft {
    const items = locator.split(":");
    const itemsLength = items.length;
    if (itemsLength < 2) {
        throw new Error(`Invalid locator format, expected <chain>:<contractAddress>:<tokenId>`);
    }

    return {
        chain: items[0] as VCChain,
        contractAddress: items[1],
        tokenId: items[2],
    };
}

/**
 * Checks if an object is of type `VerifiableCredential` or `EncryptedVerifiableCredential`.
 *
 * @param obj - The object to check.
 * @returns `true` if the object is of type `VerifiableCredential` or `EncryptedVerifiableCredential`, otherwise `false`.
 */
export function isCredentialType(obj: any): obj is VerifiableCredentialType {
    if (obj == null || typeof obj.id !== "string") {
        return false;
    }
    if (isEncryptedVerifiableCredential(obj)) {
        return true;
    }
    if (isVerifiableCredential(obj)) {
        return true;
    }

    return false;
}

/**
 * Checks if an object is a `VerifiableCredential`.
 *
 * @param credential - The credential object to check.
 * @returns `true` if the object is a valid `VerifiableCredential`, otherwise `false`.
 */
export function isVerifiableCredential(credential: VerifiableCredentialType): credential is VerifiableCredential {
    credential = credential as VerifiableCredential;
    const fields = [
        "id",
        "credentialSubject",
        //"validUntil", validUntil is optional
        //"description", description is optional
        //"name", name is optional
        "nft",
        "issuer",
        "type",
        "validFrom",
        "@context",
        "proof",
    ];
    for (const field of fields) {
        if (!credential[field as keyof VerifiableCredential]) {
            return false;
        }
    }

    const nftFields = ["tokenId", "chain", "contractAddress"];
    for (const field of nftFields) {
        if (!credential.nft[field as keyof Nft]) {
            return false;
        }
    }

    return true;
}

/**
 * Checks if an object is an `EncryptedVerifiableCredential`.
 *
 * @param credential - The credential object to check.
 * @returns `true` if the object is a valid `EncryptedVerifiableCredential`, otherwise `false`.
 * @throws Will throw an error if the object does not have a valid structure for a verifiable credential.
 */
export function isEncryptedVerifiableCredential(
    credential: VerifiableCredentialType
): credential is EncryptedVerifiableCredential {
    if (credential == null || typeof credential.id !== "string") {
        throw new Error("obj should be a VerifiableCredential or EncryptedVerifiableCredential object");
    }
    return (
        (credential as EncryptedVerifiableCredential).id !== undefined &&
        (credential as EncryptedVerifiableCredential).payload !== undefined
    );
}

/**
 * Checks if a string is a valid and supported chain for VCs.
 *
 * @param chain - The chain string to check.
 * @returns `true` if the string is a valid `VCChain`, otherwise `false`.
 */
export function isVcChain(chain: string): chain is VCChain {
    return Object.values(VCChain).includes(chain as VCChain);
}

/**
 * Checks if an object is a valid NFT.
 *
 * @param nft - The object to check.
 * @returns `true` if the object is a valid NFT, otherwise `false`.
 */
export function isVcNft(nft: any): nft is Nft {
    return !(nft == null || nft.chain == null || nft.contractAddress == null || nft.tokenId == null);
}

/**
 * Checks if an object is a valid `VCContractMetadata`.
 *
 * @param metadata - The object to check.
 * @returns `true` if the object is a valid `VCContractMetadata`, otherwise `false`.
 */
export function isVerifiableCredentialContractMetadata(metadata: any): metadata is VCContractMetadata {
    return !(
        metadata == null ||
        metadata.credentialMetadata == null ||
        metadata.credentialMetadata.type == null ||
        metadata.credentialMetadata.issuerDid == null ||
        metadata.credentialMetadata.credentialsEndpoint == null ||
        !Array.isArray(metadata.credentialMetadata.type)
    );
}
