import { CrossmintService } from "@/api";
import {
    Blockchain,
    FireblocksNCWallet,
    getBlockExplorerByBlockchain,
    getChainIdByBlockchain,
    getDisplayNameByBlockchain,
    getTickerByBlockchain,
    getTickerNameByBlockchain,
    getUrlProviderByBlockchain,
    getWeb3AuthBlockchain,
} from "@/blockchain";
import { FireblocksNCWSigner, UserIdentifier, WalletConfig, Web3AuthSigner } from "@/types";
import { parseToken } from "@/utils";
import type { SmartAccountSigner } from "@alchemy/aa-core";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { convertEthersSignerToAccountSigner, getRPCProviderOwner } from "@zerodev/sdk";
import { Signer } from "ethers";

export async function createOwnerSigner(
    user: UserIdentifier,
    chain: Blockchain,
    walletConfig: WalletConfig,
    crossmintService: CrossmintService
): Promise<SmartAccountSigner> {
    if (isFireblocksNCWSigner(walletConfig.signer)) {
        const { passphrase, walletId, deviceId } = walletConfig.signer;
        const fireblocks = await FireblocksNCWallet(user.email, crossmintService, chain, passphrase, walletId && deviceId ? { walletId, deviceId } : undefined);
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

        return getRPCProviderOwner(provider);
    } else {
        return convertEthersSignerToAccountSigner(walletConfig.signer as Signer);
    }
}

function isFireblocksNCWSigner(signer: any): signer is FireblocksNCWSigner & { walletId: string; deviceId: string; } {
    return signer && "walletId" in signer && "deviceId" in signer && signer.type === "FIREBLOCKS_NCW";
}

function isWeb3AuthSigner(signer: any): signer is Web3AuthSigner {
    return signer && signer.type === "WEB3_AUTH";
}