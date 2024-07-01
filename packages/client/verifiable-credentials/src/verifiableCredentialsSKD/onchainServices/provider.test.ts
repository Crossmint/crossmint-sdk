import { StaticJsonRpcProvider } from "@ethersproject/providers";

import { configManager } from "../configs";
import { getProvider } from "./provider";

describe("getProvider", () => {
    beforeAll(() => {
        configManager.init({});
    });
    it("returns the production provider for production chain", () => {
        const provider = getProvider("polygon");
        expect(provider).toBeInstanceOf(StaticJsonRpcProvider);
        expect(provider.connection.url).toBe("https://polygon.llamarpc.com/");
    });

    it("returns the test provider for non-production chain", () => {
        const provider = getProvider("poly-amoy");
        expect(provider).toBeInstanceOf(StaticJsonRpcProvider);
        expect(provider.connection.url).toBe("https://rpc-amoy.polygon.technology/");
    });
});
