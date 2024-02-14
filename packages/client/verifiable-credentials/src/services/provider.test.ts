import { StaticJsonRpcProvider } from "@ethersproject/providers";

import { getProvider } from "./provider";

describe("getProvider", () => {
    it("returns the production provider for production environments", () => {
        const provider = getProvider("prod");
        expect(provider).toBeInstanceOf(StaticJsonRpcProvider);
        expect(provider.connection.url).toBe("https://rpc-mainnet.maticvigil.com/");
    });

    it("returns the test provider for non-production environments", () => {
        const provider = getProvider("dev");
        expect(provider).toBeInstanceOf(StaticJsonRpcProvider);
        expect(provider.connection.url).toBe("https://rpc-mumbai.maticvigil.com/");
    });
});
