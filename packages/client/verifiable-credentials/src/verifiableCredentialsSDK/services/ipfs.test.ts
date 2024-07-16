import { configManager } from "../configs";
import { IPFSService } from "./ipfs";

global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
) as jest.Mock;

describe("IPFSService", () => {
    let ipfsService: IPFSService;

    beforeEach(() => {
        configManager.init({});
        ipfsService = new IPFSService();
    });

    describe("formatUrl", () => {
        it("should correctly format URL", () => {
            const baseUrl = "http://example.com/";
            const result = ipfsService.formatUrl(baseUrl, "123");
            expect(result).toEqual("http://example.com/123");
        });
    });

    describe("getFile", () => {
        beforeEach(() => {});

        it("should fetch file from gateway", async () => {
            const uri = "ipfs://123";
            const result = await ipfsService.getFile(uri);
            expect(result).toEqual({});
            expect(global.fetch).toHaveBeenCalled();
        });

        it("should throw error when fetch fails", async () => {
            (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error("Fetch error"));

            const uri = "ipfs://123";
            await expect(ipfsService.getFile(uri)).rejects.toThrow(
                `Failed to get file for ${uri}, all gateways failed`
            );
        });
    });
});
