import {
    getBlockExplorerByBlockchain,
    getChainIdByBlockchain,
    getDisplayNameByBlockchain,
    getTickerByBlockchain,
    getTickerNameByBlockchain,
    getUrlProviderByBlockchain,
    getWeb3AuthBlockchain,
} from "@/blockchain";
import { Provider, WalletConfig, Web3AuthSigner } from "@/types";
import { parseToken } from "@/utils";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { providerToSmartAccountSigner } from "@zerodev/sdk";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export async function createSmartAccountSigner(chain: BlockchainIncludingTestnet, walletConfig: WalletConfig) {
    if (isWeb3AuthSigner(walletConfig.signer)) {
        const signer = walletConfig.signer;
        const chainId = getChainIdByBlockchain(chain);
        const chainConfig = {
            chainNamespace: CHAIN_NAMESPACES.EIP155,
            chainId: "0x" + chainId!.toString(16),
            rpcTarget: getUrlProviderByBlockchain(chain),
            displayName: getDisplayNameByBlockchain(chain),
            blockExplorer: getBlockExplorerByBlockchain(chain),
            ticker: getTickerByBlockchain(chain),
            tickerName: getTickerNameByBlockchain(chain),
        };
        const web3auth = new Web3Auth({
            clientId: signer.clientId,
            web3AuthNetwork: getWeb3AuthBlockchain(chain),
            usePnPKey: false,
        });

        const privateKeyProvider = new EthereumPrivateKeyProvider({ config: { chainConfig } });
        await web3auth.init(privateKeyProvider);
        const { sub } = parseToken(signer.jwt);

        const provider = await web3auth.connect({
            verifier: signer.verifierId,
            verifierId: sub,
            idToken: signer.jwt,
        });

        return providerToSmartAccountSigner(provider!);
    } else if (isProvider(walletConfig.signer)) {
        return providerToSmartAccountSigner(walletConfig.signer.provider);
    }
}

function isProvider(signer: any): signer is Provider {
    return signer && signer.type === "PROVIDER";
}

function isWeb3AuthSigner(signer: any): signer is Web3AuthSigner {
    return signer && signer.type === "WEB3_AUTH";
}
