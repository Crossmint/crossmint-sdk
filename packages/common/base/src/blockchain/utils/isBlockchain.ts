import { BLOCKCHAINS, Blockchain } from "../types";

export function isBlockchain<T extends Blockchain = Blockchain>(value: unknown, expectedBlockchain?: T): value is T {
    return expectedBlockchain ? value === expectedBlockchain : BLOCKCHAINS.includes(value as Blockchain);
}
