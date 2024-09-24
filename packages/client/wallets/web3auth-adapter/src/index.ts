import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { type TORUS_NETWORK_TYPE, Web3Auth } from "@web3auth/single-factor-auth";
import type { EIP1193Provider } from "viem";

import {
    type EVMBlockchainIncludingTestnet as Blockchain,
    blockchainToChainId,
    blockchainToDisplayName,
} from "@crossmint/common-sdk-base";

import { parseToken } from "./auth";
import {
    getBlockExplorerByBlockchain,
    getTickerByBlockchain,
    getTickerNameByBlockchain,
    getUrlProviderByBlockchain,
} from "./networks";

export type { TORUS_NETWORK_TYPE } from "@web3auth/single-factor-auth";
export { EVMBlockchainIncludingTestnet as Chain } from "@crossmint/common-sdk-base";
export type Web3AuthSignerParams = {
    clientId: string;
    verifierId: string;
    web3AuthNetwork: TORUS_NETWORK_TYPE;
    jwt: string;
    chain: Blockchain;
};

export async function getWeb3AuthSigner({
    chain,
    clientId,
    web3AuthNetwork,
    jwt,
    verifierId,
}: Web3AuthSignerParams): Promise<EIP1193Provider> {
    const chainId = blockchainToChainId(chain);
    const chainConfig = {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: "0x" + chainId!.toString(16),
        rpcTarget: getUrlProviderByBlockchain(chain),
        displayName: blockchainToDisplayName(chain),
        blockExplorer: getBlockExplorerByBlockchain(chain),
        ticker: getTickerByBlockchain(chain),
        tickerName: getTickerNameByBlockchain(chain),
    };

    const web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork,
        usePnPKey: false,
    });

    const privateKeyProvider = new EthereumPrivateKeyProvider({ config: { chainConfig } });
    await web3auth.init(privateKeyProvider);
    const { sub } = parseToken(jwt);

    const provider = await web3auth.connect({
        verifier: verifierId,
        verifierId: sub,
        idToken: jwt,
    });

    if (provider == null) {
        throw new Error("Web3auth returned a null signer");
    }
    return provider as EIP1193Provider;
}
