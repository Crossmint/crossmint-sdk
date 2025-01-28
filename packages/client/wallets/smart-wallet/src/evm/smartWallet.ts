import type { PublicClient, HttpTransport } from "viem";

import type { SmartWalletChain } from "./chains";
import type { SmartWalletClient } from "./smartWalletClient";
class EVMSmartWallet {
    constructor(
        public readonly client: { public: PublicClient<HttpTransport>; wallet: SmartWalletClient },
        public readonly chain: SmartWalletChain
    ) {}
}

export { EVMSmartWallet };
