import { crossmintAPI } from "../crossmintAPI";
import { CredentialService } from "./getCredential";

global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({ unencryptedCredential: {} }),
    })
) as jest.Mock;

describe("getCredentialFromId", () => {
    let credentialService: CredentialService;
    beforeEach(() => {
        crossmintAPI.init("test", { environment: "test" });
        jest.spyOn(crossmintAPI, "getHeaders").mockReturnValue({} as any);
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ unencryptedCredential: { id: "test", type: "VerifiableCredential" } }),
        });
        credentialService = new CredentialService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should fetch credential by id", async () => {
        jest.spyOn(crossmintAPI, "getBaseUrl").mockReturnValue("test.com");
        const credential = await credentialService.getById("test-id");
        expect(credential).toEqual({ id: "test", type: "VerifiableCredential" });
        expect(fetch).toHaveBeenCalledWith("test.com/api/v1-alpha1/credentials/test-id", {
            method: "GET",
            headers: {},
        });
    });

    it("should throw if fetch throws an error", async () => {
        jest.spyOn(crossmintAPI, "getBaseUrl").mockReturnValue("test-env");
        (fetch as jest.Mock).mockRejectedValue(new Error("Fetch error"));
        const credential = credentialService.getById("test-id");
        expect(credential).rejects.toThrow('Failed to get credential {"credentialId":"test-id"} from crossmint');
    });
});
