import * as LitJsSdk from "@lit-protocol/lit-node-client";

import * as API from "./crossmintAPI";
import { Lit } from "./litInterface";

jest.mock("@lit-protocol/lit-node-client");

describe("Lit", () => {
    let lit: Lit;
    let litSpy: jest.SpyInstance;

    const mockNodeClient = {
        connect: jest.fn(),
        getSessionSigs: jest.fn().mockReturnValue({ sig: "sig" }),
    };

    beforeEach(() => {
        jest.spyOn(API, "getUsageOrigin").mockReturnValue("client");
        lit = new Lit();
        litSpy = jest.spyOn(LitJsSdk, "LitNodeClient");
        litSpy.mockImplementation(() => {
            return mockNodeClient as any;
        });
        jest.spyOn(LitJsSdk, "checkAndSignAuthMessage").mockResolvedValue({} as any);
    });

    it("should correctly set prod env", () => {
        const litProd = new Lit("prod");
        expect(litProd.prod).toBe(true);

        const litTest = new Lit("test");
        expect(litTest.prod).toBe(false);
    });

    it("should connect to the Lit network", async () => {
        const mockConnect = jest.fn();
        litSpy.mockImplementation(() => {
            return { connect: mockConnect } as any;
        });
        await lit.connect();

        expect(mockConnect).toHaveBeenCalled();
    });

    it("should throw an error when decryption fails", async () => {
        const mockDecryptZipFileWithMetadata = jest.fn().mockResolvedValue({});
        jest.spyOn(LitJsSdk, "decryptZipFileWithMetadata").mockImplementation(mockDecryptZipFileWithMetadata);

        await expect(lit.decrypt("test")).rejects.toThrow(
            `Failed to decrypt file. Hint: Be sure the file was encrypted on the same network, currently using manzano network.`
        );
    });

    it("should decrypt a base64 ciphertext", async () => {
        const mockDecryptZipFileWithMetadata = jest.fn().mockResolvedValue({
            decryptedFile: [1, 2, 3],
        });

        jest.spyOn(LitJsSdk, "decryptZipFileWithMetadata").mockImplementation(mockDecryptZipFileWithMetadata);
        jest.spyOn(LitJsSdk, "uint8arrayToString").mockImplementation((arr) => arr.toString());
        jest.spyOn(LitJsSdk, "base64StringToBlob").mockImplementation((a) => a as any);

        const result = await lit.decrypt("test");

        expect(mockDecryptZipFileWithMetadata).toHaveBeenCalledWith({
            sessionSigs: { sig: "sig" },
            file: "test" as any,
            litNodeClient: mockNodeClient,
        });
        expect(result).toEqual("1,2,3");
    });
});
