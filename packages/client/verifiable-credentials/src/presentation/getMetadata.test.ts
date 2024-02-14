import * as API from "@/services/crossmintAPI";
import { ethers, utils } from "ethers";

import { CredentialsCollection } from "../types/nfts";
import { ContactMetadataService, formatUrl } from "./getMetadata";

global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
) as jest.Mock;

jest.mock("@krebitdao/eip712-vc", () => {
    return {
        EIP712VC: jest.fn().mockImplementation(() => {}),
    };
});

describe("getMetadata", () => {
    let metadataService: ContactMetadataService;
    beforeEach(() => {
        metadataService = new ContactMetadataService();
        jest.resetAllMocks();
    });

    describe("getMetadata", () => {
        beforeEach(() => {
            jest.spyOn(ethers, "Contract").mockImplementation(
                () =>
                    ({
                        contractURI: jest.fn().mockResolvedValue("ipfs://uri"),
                    } as any)
            );

            API.CrossmintAPI.ipfsGateways = ["gateway1", "gateway2"];
        });

        it("should fetch metadata", async () => {
            const mockResponse = { a: "a" };

            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            } as any);

            const result = await metadataService.getMetadata("contractAddress", "environment");

            expect(result).toEqual(mockResponse);
            expect(fetch).toHaveBeenCalled();
        });
    });

    describe("getContractWithVCMetadata", () => {
        it("should fetch contract with VC metadata", async () => {
            const mockResponse = { a: "a", credentialMetadata: "metadata" };
            const collections: CredentialsCollection[] = [
                { contractAddress: "contractAddress1" } as any,
                { contractAddress: "contractAddress2" } as any,
            ];

            jest.spyOn(metadataService, "getMetadata").mockResolvedValueOnce(mockResponse);
            jest.spyOn(metadataService, "getMetadata").mockResolvedValueOnce(null);

            const result = await metadataService.getContractWithVCMetadata(collections, "environment");

            expect(result).toEqual([{ contractAddress: "contractAddress1", metadata: mockResponse }]);
        });
    });
});

describe("formatUrl", () => {
    it("should correctly format URL", () => {
        const baseUrl = "http://example.com/{cid}";

        const result = formatUrl(baseUrl, "123");

        expect(result).toEqual("http://example.com/123");
    });
});
