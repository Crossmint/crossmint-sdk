import { EVMBlockchain, EVMNFT } from "@crossmint/common-sdk-base";

export function parseLocator(locator: string): EVMNFT {
    const items = locator.split(":");
    const itemsLength = items.length;
    if (itemsLength < 2) {
        throw new Error(`Invalid locator format, expected <chain>:<contractAddress>:<tokenId>`);
    }

    return {
        chain: items[0] as EVMBlockchain,
        contractAddress: items[1],
        tokenId: items[2],
    };
}

export function isPolygon(chain: string): boolean {
    return chain.includes("poly");
}
