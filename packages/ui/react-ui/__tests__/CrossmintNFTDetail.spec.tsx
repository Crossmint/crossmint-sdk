import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";

import { NFT } from "@crossmint/client-sdk-base";

import { CrossmintNFTDetail } from "../src/components/CrossmintNFTDetail";

const nft: NFT = { chain: "ethereum", contractAddress: "0x12345", tokenId: "12" };

describe("when only passing mandatory fields", () => {
    test("should add them to the iframe query params", () => {
        render(<CrossmintNFTDetail nft={nft} />);
        const iframe = screen.getByRole("nft-details");
        const src = iframe.getAttribute("src");
        expect(src).toContain("/sdk/wallets/tokens/ethereum:0x12345:12");
        expect(src).toContain("clientVersion=");
    });
});

describe("when not setting any environment", () => {
    test("should default to production", () => {
        render(<CrossmintNFTDetail nft={nft} />);
        const iframe = screen.getByRole("nft-details");
        const src = iframe.getAttribute("src");
        expect(src).toContain("https://www.crossmint.com/");
    });
});

describe("when setting the environment to staging", () => {
    test("should use the staging url", () => {
        render(<CrossmintNFTDetail nft={nft} environment="staging" />);
        const iframe = screen.getByRole("nft-details");
        const src = iframe.getAttribute("src");
        expect(src).toContain("https://staging.crossmint.com/");
    });
});
