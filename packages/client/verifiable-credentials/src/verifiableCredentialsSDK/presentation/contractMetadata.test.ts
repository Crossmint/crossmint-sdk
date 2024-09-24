import * as ethersContracts from "@ethersproject/contracts";

import { configManager } from "../configs";
import { IPFSService } from "../services/ipfs";
import type { CredentialsCollection } from "../types";
import { ContractMetadataService } from "./contractMetadata";

jest.mock("../services/ipfs");

describe("getMetadata", () => {
    let metadataService: ContractMetadataService;
    beforeEach(() => {
        metadataService = new ContractMetadataService("polygon");
        jest.resetAllMocks();
        configManager.init({});
    });

    describe("getMetadata", () => {
        beforeEach(() => {
            jest.spyOn(ethersContracts, "Contract").mockImplementation(
                () =>
                    ({
                        contractURI: jest.fn().mockResolvedValue("ipfs://uri"),
                    }) as any
            );

            configManager.init({ ipfsGateways: ["gateway1", "gateway2"] });
        });

        it("should fetch metadata", async () => {
            const mockResponse = { a: "a" };
            (IPFSService.prototype.getFile as jest.Mock).mockResolvedValue(mockResponse);

            const result = await metadataService.getContractMetadata("contractAddress");

            expect(result).toEqual(mockResponse);
        });
    });

    describe("getContractWithVCMetadata", () => {
        it("should fetch contract with VC metadata", async () => {
            const mockResponse = {
                a: "a",
                credentialMetadata: {
                    issuerDid: "issuerDid",
                    type: ["type1", "type2"],
                    credentialsEndpoint: "credentialsEndpoint",
                },
            };
            const collections: CredentialsCollection[] = [
                { contractAddress: "contractAddress1" } as any,
                { contractAddress: "contractAddress2" } as any,
            ];

            jest.spyOn(metadataService, "getContractMetadata").mockResolvedValueOnce(mockResponse);
            jest.spyOn(metadataService, "getContractMetadata").mockResolvedValueOnce(null);

            const result = await metadataService.getContractsWithCredentialMetadata(collections);

            expect(result).toEqual([{ contractAddress: "contractAddress1", metadata: mockResponse }]);
        });
    });
});
