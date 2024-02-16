import { CrossmintAPI } from "../services/crossmintAPI";
import { getCredentialFromId } from "./getCredential";

global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
    })
) as jest.Mock;

describe("getCredentialFromId", () => {
    beforeEach(() => {
        jest.spyOn(CrossmintAPI, "getHeaders").mockReturnValue({} as any);
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: "test", type: "VerifiableCredential" }),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should fetch credential by id", async () => {
        const credential = await getCredentialFromId("test-id", "test.com");
        expect(credential).toEqual({ id: "test", type: "VerifiableCredential" });
        expect(fetch).toHaveBeenCalledWith("test.com/api/unstable/credentials/test-id", {
            method: "GET",
            headers: {},
        });
    });

    it("should return null if fetch throws an error", async () => {
        (fetch as jest.Mock).mockRejectedValue(new Error("Fetch error"));
        const credential = await getCredentialFromId("test-id", "test-env");
        expect(credential).toBeNull();
    });
});
