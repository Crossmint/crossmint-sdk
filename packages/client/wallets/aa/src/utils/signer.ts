import {
    getBlockExplorerByBlockchain,
    getTickerByBlockchain,
    getTickerNameByBlockchain,
    getUrlProviderByBlockchain,
} from "@/blockchain";
import { EOAWalletConfig, ViemAccount, Web3AuthSigner } from "@/types";
import { WalletSdkError, parseToken } from "@/utils";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { providerToSmartAccountSigner } from "permissionless";
import type { SmartAccountSigner } from "permissionless/accounts";
import { Address, EIP1193Provider, Hex } from "viem";
import { Web3 } from "web3";

import {
    EVMBlockchainIncludingTestnet,
    blockchainToChainId,
    blockchainToDisplayName,
} from "@crossmint/common-sdk-base";

type CreateOwnerSignerInput = {
    chain: EVMBlockchainIncludingTestnet;
    walletConfig: EOAWalletConfig;
};

export async function createOwnerSigner({
    chain,
    walletConfig,
}: CreateOwnerSignerInput): Promise<SmartAccountSigner<"custom", Address>> {
    if (isWeb3AuthSigner(walletConfig.signer)) {
        const signer = walletConfig.signer as Web3AuthSigner;

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
            clientId: signer.clientId,
            web3AuthNetwork: signer.web3AuthNetwork,
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

        if (provider == null) {
            throw new WalletSdkError("Web3auth returned a null signer");
        }

        const web3 = new Web3(provider);
        const [address] = await web3.eth.getAccounts();
        return await providerToSmartAccountSigner(provider as EIP1193Provider, { signerAddress: address as Hex });
    } else if (isEIP1193Provider(walletConfig.signer)) {
        const web3 = new Web3(walletConfig.signer);
        const [address] = await web3.eth.getAccounts();
        return await providerToSmartAccountSigner(walletConfig.signer, { signerAddress: address as Hex });
    } else if (isAccount(walletConfig.signer)) {
        return walletConfig.signer.account;
    } else {
        const signer = walletConfig.signer as any;
        throw new WalletSdkError(`The signer type ${signer.type} is not supported`);
    }
}

function isWeb3AuthSigner(signer: any): signer is Web3AuthSigner {
    return signer && signer.type === "WEB3_AUTH";
}

function isEIP1193Provider(signer: any): signer is EIP1193Provider {
    return signer && typeof signer.request === "function";
}

export function isAccount(signer: any): signer is ViemAccount {
    return signer && signer.type === "VIEM_ACCOUNT";
}
