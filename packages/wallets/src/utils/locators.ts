import { isValidAddress } from "@crossmint/common-sdk-base";

import { InvalidAddressError } from "./errors";
import type { UserLocator } from "../wallets/types";

export function toRecipientLocator(to: string | UserLocator): string {
    if (typeof to === "string") {
        if (!isValidAddress(to)) {
            throw new InvalidAddressError(
                `Invalid recipient address: "${to}". Expected a valid EVM (0x...), Solana (base58), or Stellar (G.../C...) address.`
            );
        }
        return to;
    }
    if ("email" in to) {
        return `email:${to.email}`;
    }
    if ("x" in to) {
        return `x:${to.x}`;
    }
    if ("twitter" in to) {
        return `twitter:${to.twitter}`;
    }
    if ("phone" in to) {
        return `phoneNumber:${to.phone}`;
    }
    if ("userId" in to) {
        return `userId:${to.userId}`;
    }
    throw new Error("Invalid recipient locator");
}

export function toTokenLocator(token: string, chain: string): string {
    if (isValidAddress(token)) {
        return `${chain}:${token}`;
    }
    return `${chain}:${token.toLowerCase()}`;
}
