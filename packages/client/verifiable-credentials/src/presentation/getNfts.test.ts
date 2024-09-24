import { crossmintAPI } from "../crossmintAPI";
import type { CrossmintWalletNft } from "../types/nfts";
import { filterVCCompErc721, getWalletNfts } from "./getNfts";

global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
    })
) as jest.Mock;

describe("getNfts", () => {
    beforeEach(() => {
        crossmintAPI.init("test", { environment: "test" });
        jest.spyOn(crossmintAPI, "getHeaders").mockReturnValue({} as any);
    });
    it("should fetch wallet NFTs", async () => {
        const mockResponse = Array(50).fill({ a: "a" });
        const mockResponse2 = [{ a: "a" }, { b: "b" }];

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        } as any);

        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse2),
        } as any);

        const result = await getWalletNfts("chain", "wallet");

        expect(result).toEqual(mockResponse.concat(mockResponse2));
        expect(fetch).toHaveBeenCalled();
    });

    it("should filter Polygon ERC-721 NFTs", () => {
        const nfts: CrossmintWalletNft[] = [
            { chain: "polygon", tokenStandard: "erc-721" } as any,
            { chain: "ethereum", tokenStandard: "erc-721" } as any,
        ];

        const result = filterVCCompErc721(nfts);

        expect(result).toEqual([{ chain: "polygon", contractAddress: undefined, tokenId: undefined }]);
    });
});
