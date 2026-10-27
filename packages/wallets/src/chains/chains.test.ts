import { describe, expect, it } from "vitest";
import { arc as viemArc, arcTestnet as viemArcTestnet } from "viem/chains";
import { toViemChain } from "./chains";

describe("toViemChain", () => {
    describe("arc", () => {
        it("uses the RPC endpoint Circle publishes for Arc Mainnet", () => {
            const chain = toViemChain("arc");

            expect(chain.id).toBe(viemArc.id);
            expect(chain.rpcUrls.default.http[0]).toBe("https://rpc.mainnet.arc.io");
            expect(chain.blockExplorers?.default.url).toBe("https://explorer.arc.io");
        });

        it("reports native USDC with 18 decimals", () => {
            expect(toViemChain("arc").nativeCurrency).toEqual(viemArc.nativeCurrency);
        });
    });

    describe("arc-testnet", () => {
        it("reports native USDC with 18 decimals, like Arc Mainnet", () => {
            const chain = toViemChain("arc-testnet");

            expect(chain.id).toBe(viemArcTestnet.id);
            expect(chain.nativeCurrency).toEqual(viemArcTestnet.nativeCurrency);
            expect(chain.nativeCurrency.decimals).toBe(18);
        });
    });
});
