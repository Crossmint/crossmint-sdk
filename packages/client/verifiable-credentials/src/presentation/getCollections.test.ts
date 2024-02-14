import { CredentialsCollection, VC_EVMNFT } from "../types/nfts";
import { getCollections, getCredentialCollections } from "./getCollections";
import { ContactMetadataService } from "./getMetadata";
import * as GetNfts from "./getNfts";

jest.mock("./getMetadata");
jest.mock("@krebitdao/eip712-vc", () => {
    return {
        EIP712VC: jest.fn().mockImplementation(() => {}),
    };
});

describe("getCollections", () => {
    it("should group NFTs by contract address", () => {
        const nfts: VC_EVMNFT[] = [
            { contractAddress: "address1" } as any,
            { contractAddress: "address1" } as any,
            { contractAddress: "address2" } as any,
        ];

        const result = getCollections(nfts);

        expect(result).toEqual([
            { contractAddress: "address1", nfts: [nfts[0], nfts[1]], metadata: {} },
            { contractAddress: "address2", nfts: [nfts[2]], metadata: {} },
        ]);
    });
});

describe("getCredentialCollections", () => {
    beforeEach(() => {
        jest.spyOn(GetNfts, "getWalletNfts").mockResolvedValue([] as any);
    });

    it("should throw error if chain is not polygon", async () => {
        await expect(getCredentialCollections("ethereum", "wallet", {}, "environment")).rejects.toThrow(
            "Only polygon is supported"
        );
    });

    it("should filter collections by types if filter is provided", async () => {
        const collections: CredentialsCollection[] = [
            { metadata: { credentialMetadata: { type: ["type1"] } } } as any,
            { metadata: { credentialMetadata: { type: ["type2"] } } } as any,
        ];
        jest.spyOn(ContactMetadataService.prototype, "getContractWithVCMetadata").mockResolvedValue(collections as any);

        const result = await getCredentialCollections("polygon", "wallet", { types: ["type1"] }, "environment");

        expect(result).toEqual([collections[0]]);
    });
});
