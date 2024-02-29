import { BackwardsCompatibleChains } from "@/types";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export function isLocalhost() {
    if (process.env.NODE_ENV === "test") {
        return false;
    }

    return window.location.origin.includes("localhost");
}

export function isEmpty(str: string | undefined | null): str is undefined | null {
    return !str || str.length === 0 || str.trim().length === 0;
}

export function transformBackwardsCompatibleChains<B extends BlockchainIncludingTestnet = BlockchainIncludingTestnet>(
    chain: B | BackwardsCompatibleChains
): B {
    switch (chain) {
        case "mumbai":
            return "polygon-mumbai" as B;
        case "goerli":
            return "ethereum-goerli" as B;
        default:
            return chain;
    }
}
