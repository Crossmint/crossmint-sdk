import * as LitJsSdk from "@lit-protocol/lit-node-client";

import { Lit } from "./litInterface";

jest.mock("@lit-protocol/lit-node-client");

describe("Lit", () => {
    let lit: Lit;
    let litSpy: jest.SpyInstance;

    beforeEach(() => {
        lit = new Lit();
        litSpy = jest.spyOn(LitJsSdk, "LitNodeClient");
        litSpy.mockImplementation(() => {
            return {
                connect: jest.fn(),
            } as any;
        });
        jest.spyOn(LitJsSdk, "checkAndSignAuthMessage").mockResolvedValue({} as any);
    });

    it("should throw an error when production environment is used", () => {
        expect(() => new Lit("cayenne", "prod")).toThrow("Production environment not supported yet");
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

        await expect(lit.decrypt("test")).rejects.toThrow("Failed to decrypt file");
    });

    it("should decrypt a base64 ciphertext", async () => {
        const mockCheckAndSignAuthMessage = jest.fn().mockResolvedValue("test");
        const mockDecryptZipFileWithMetadata = jest.fn().mockResolvedValue({
            decryptedFile: [1, 2, 3],
        });

        jest.spyOn(LitJsSdk, "decryptZipFileWithMetadata").mockImplementation(mockDecryptZipFileWithMetadata);
        jest.spyOn(LitJsSdk, "uint8arrayToString").mockImplementation((arr) => arr.toString());
        jest.spyOn(LitJsSdk, "checkAndSignAuthMessage").mockImplementation(mockCheckAndSignAuthMessage);

        const result = await lit.decrypt("test");

        expect(mockDecryptZipFileWithMetadata).toHaveBeenCalled();
        expect(mockCheckAndSignAuthMessage).toHaveBeenCalled();
        expect(result).toEqual("1,2,3");
    });
});
