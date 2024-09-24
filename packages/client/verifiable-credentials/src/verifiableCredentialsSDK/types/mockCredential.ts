import type { VerifiableCredential } from "./verifiableCredential";

export const mockCredential: VerifiableCredential = {
    id: "urn:uuid:84a101bf-ded2-442d-b766-4e599d35fe89",
    credentialSubject: {
        name: "s",
        id: "did:polygon-amoy:0x1B887669437644aA348c518844660ef8d63bd643",
    },
    nft: {
        tokenId: "13",
        chain: "polygon-amoy",
        contractAddress: "0x2245D3fdFF160503897020A1165b796cEaC00B68",
    },
    issuer: {
        id: "did:polygon-amoy:0xd9d8BA9D5956f78E02F4506940f42ac2dAB9DABd",
    },
    type: ["VerifiableCredential", "userName"],
    validFrom: "2024-07-02T22:56:30.187Z",
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    proof: {
        verificationMethod: "did:polygon-amoy:0xd9d8BA9D5956f78E02F4506940f42ac2dAB9DABd#evmAddress",
        created: "2024-07-02T22:56:30.187Z",
        proofPurpose: "assertionMethod",
        type: "EthereumEip712Signature2021",
        proofValue:
            "0x5b88ebef582fd631bca407e9b6454190a0346de45285add0ffe19a4f374acc6463f1f418c60bc76fb6168884a763fb4e28297f3f8a1c381debedf4e2deb293fe1c",
        eip712: {
            domain: {
                name: "Crossmint",
                version: "0.1",
                chainId: 4,
                verifyingContract: "0xD8393a735e8b7B6E199db9A537cf27C61Aa74954",
            },
            types: {
                VerifiableCredential: [
                    {
                        name: "@context",
                        type: "string[]",
                    },
                    {
                        name: "type",
                        type: "string[]",
                    },
                    {
                        name: "id",
                        type: "string",
                    },
                    {
                        name: "issuer",
                        type: "Issuer",
                    },
                    {
                        name: "credentialSubject",
                        type: "CredentialSubject",
                    },
                    {
                        name: "validFrom",
                        type: "string",
                    },
                    {
                        name: "nft",
                        type: "Nft",
                    },
                ],
                CredentialSubject: [
                    {
                        name: "id",
                        type: "string",
                    },
                    {
                        name: "name",
                        type: "string",
                    },
                ],
                Issuer: [
                    {
                        name: "id",
                        type: "string",
                    },
                ],
                Nft: [
                    {
                        name: "tokenId",
                        type: "string",
                    },
                    {
                        name: "contractAddress",
                        type: "string",
                    },
                    {
                        name: "chain",
                        type: "string",
                    },
                ],
            },
            primaryType: "VerifiableCredential",
        },
    },
};
