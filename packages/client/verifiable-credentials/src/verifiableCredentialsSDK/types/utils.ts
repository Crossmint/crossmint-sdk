import { VCChain } from "./chain";
import { VCContractMetadata } from "./collection";
import { Nft } from "./nft";
import { EncryptedVerifiableCredential, VerifiableCredential, VerifiableCredentialType } from "./verifiableCredential";

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
 * Returns true if the object is a VerifiableCredential or EncryptedVerifiableCredential
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

export function isVcChain(chain: string): chain is VCChain {
    return Object.values(VCChain).includes(chain as VCChain);
}

export function isVcNft(nft: any): nft is Nft {
    return !(nft == null || nft.chain == null || nft.contractAddress == null || nft.tokenId == null);
}

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
