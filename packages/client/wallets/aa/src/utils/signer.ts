import { CrossmintService } from "@/api";
import {
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
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/single-factor-auth";
import type { SmartAccountSigner } from "permissionless/accounts";
import { createWalletClient, custom, publicActions } from "viem";
import type {
    Account,
    Address,
    Chain,
    Hex,
    SignableMessage,
    Transport,
    TypedData,
    TypedDataDefinition,
    WalletClient,
} from "viem";
import { signTypedData } from "viem/actions";
import { Web3 } from "web3";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export async function createOwnerSigner(
    userIdentifier: UserIdentifier,
    chain: BlockchainIncludingTestnet,
    walletConfig: WalletConfig,
    crossmintService: CrossmintService
): Promise<SmartAccountSigner<"custom", Address>> {
    const signer = walletConfig.signer as Web3AuthSigner;
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
    const web3 = new Web3(provider as any);
    const [address] = await web3.eth.getAccounts();

    const walletClient = createWalletClient({
        account: address as Hex,
        transport: custom(provider!),
    });
    return walletClientToCustomSigner(walletClient);
}

function isFireblocksNCWSigner(signer: any): signer is FireblocksNCWSigner & { walletId: string; deviceId: string } {
    return signer && signer.type === "FIREBLOCKS_NCW";
}

function isWeb3AuthSigner(signer: any): signer is Web3AuthSigner {
    return signer && signer.type === "WEB3_AUTH";
}

function walletClientToCustomSigner<TChain extends Chain | undefined = Chain | undefined>(
    walletClient: WalletClient<Transport, TChain, Account>
): SmartAccountSigner<"custom", Address> {
    return {
        address: walletClient.account.address,
        type: "local",
        source: "custom",
        publicKey: walletClient.account.address,
        signMessage: async ({ message }: { message: SignableMessage }): Promise<Hex> => {
            return walletClient.signMessage({ message });
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends keyof TTypedData | "EIP712Domain" = keyof TTypedData
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return signTypedData<TTypedData, TPrimaryType, TChain, Account>(walletClient, {
                account: walletClient.account,
                ...typedData,
            });
        },
    };
}
