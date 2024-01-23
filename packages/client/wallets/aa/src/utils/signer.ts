import { CrossmintService } from "@/api";
import {
    FireblocksNCWallet,
    getBlockExplorerByBlockchain,
    getChainIdByBlockchain,
    getDisplayNameByBlockchain,
    getTickerByBlockchain,
    getTickerNameByBlockchain,
    getUrlProviderByBlockchain,
    getWeb3AuthBlockchain,
} from "@/blockchain";
import { FireblocksNCWSigner, SignerType, UserIdentifier, WalletConfig, Web3AuthSigner } from "@/types";
import { parseToken } from "@/utils";
import type { SmartAccountSigner } from "@alchemy/aa-core";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { providerToSmartAccountSigner } from "@zerodev/sdk";
import { convertEthersSignerToAccountSigner, getRPCProviderOwner } from "@zerodev/sdk-legacy";
import { Signer } from "ethers";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export async function createOwnerSigner(
    userIdentifier: UserIdentifier,
    chain: BlockchainIncludingTestnet,
    walletConfig: WalletConfig,
    crossmintService: CrossmintService,
    signerType?: SignerType
) {
    if (isFireblocksNCWSigner(walletConfig.signer)) {
        let fireblocks: any;
        if ("walletId" in walletConfig.signer && "deviceId" in walletConfig.signer) {
            const { passphrase, walletId, deviceId } = walletConfig.signer;
            fireblocks = await FireblocksNCWallet(userIdentifier, crossmintService, chain, passphrase, {
                walletId,
                deviceId,
            });
        } else {
            const { passphrase } = walletConfig.signer;
            fireblocks = await FireblocksNCWallet(userIdentifier, crossmintService, chain, passphrase, undefined);
        }
        return fireblocks.owner;
    } else if (isWeb3AuthSigner(walletConfig.signer)) {
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
        if (signerType === "viem") {
            return await providerToSmartAccountSigner(provider!);
        } else {
            return getRPCProviderOwner(provider);
        }
    } else {
        return convertEthersSignerToAccountSigner(walletConfig.signer as Signer);
    }
}

function isFireblocksNCWSigner(signer: any): signer is FireblocksNCWSigner & { walletId: string; deviceId: string } {
    return signer && signer.type === "FIREBLOCKS_NCW";
}

function isWeb3AuthSigner(signer: any): signer is Web3AuthSigner {
    return signer && signer.type === "WEB3_AUTH";
}
