import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { NFT } from "@crossmint/common-sdk-base";

import { CrossmintNFTDetail } from "./CrossmintNFTDetail";

const nft: NFT = { chain: "ethereum", contractAddress: "0x12345", tokenId: "12" };

describe("CrossmintNFTDetail", () => {
    describe("when only passing mandatory fields", () => {
        it("should add them to the iframe query params", () => {
            render(<CrossmintNFTDetail nft={nft} />);
            const iframe = screen.getByRole("nft-details");
            const src = iframe.getAttribute("src");
            expect(src).toContain("/sdk/wallets/tokens/ethereum:0x12345:12");
            expect(src).toContain("clientVersion=");
        });
    });

    describe("when not setting any environment", () => {
        it("should default to production", () => {
            render(<CrossmintNFTDetail nft={nft} />);
            const iframe = screen.getByRole("nft-details");
            const src = iframe.getAttribute("src");
            expect(src).toContain("https://www.crossmint.com/");
        });
    });

    describe("when setting the environment to staging", () => {
        it("should use the staging url", () => {
            render(<CrossmintNFTDetail nft={nft} environment="staging" />);
            const iframe = screen.getByRole("nft-details");
            const src = iframe.getAttribute("src");
            expect(src).toContain("https://staging.crossmint.com/");
        });
    });
});
