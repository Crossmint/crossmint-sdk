import { logError, logInfo } from "@/services/logging";
import { SignerType } from "@/types";
import { SCW_SERVICE, errorToJSON } from "@/utils";
import { verifyMessage } from "@ambire/signature-validator";
import {
    ERC165SessionKeyProvider,
    KernelSmartContractAccount,
    KillSwitchProvider,
    ValidatorMode,
    ZeroDevEthersProvider,
    constants,
    convertEthersSignerToAccountSigner,
} from "@zerodev/sdk";
import { ethers } from "ethers";
import { WalletClient, createWalletClient, custom, getFunctionSelector, publicActions } from "viem";

import { EVMBlockchainIncludingTestnet, chainIdToBlockchain } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "../../api/CrossmintWalletService";
import { GenerateSignatureDataInput } from "../../types/API";
import { getUrlProviderByBlockchain, getViemNetwork, getZeroDevProjectIdByBlockchain } from "../BlockchainNetworks";
import { Custodian } from "../plugins";
import { TokenType } from "../token/Tokens";
import BaseWallet from "./BaseWallet";
import { ZeroDevEip1193Bridge } from "./ZeroDevEip1193Bridge";

export { EVMBlockchainIncludingTestnet, chainIdToBlockchain } from "@crossmint/common-sdk-base";

type SignerMap = {
    ethers: ethers.Signer;
    viem: WalletClient;
};

export class EVMAAWallet<B extends EVMBlockchainIncludingTestnet = EVMBlockchainIncludingTestnet> extends BaseWallet {
    private sessionKeySignerAddress?: string;
    chain: B;

    constructor(provider: ZeroDevEthersProvider<"ECDSA">, crossmintService: CrossmintWalletService, chain: B) {
        super(provider, crossmintService);
        this.chain = chain;
    }

    async getSigner<Type extends SignerType = SignerType>(type: Type): Promise<SignerMap[Type]> {
        switch (type) {
            case "ethers":
                return this.provider.getSigner() as any;
            case "viem": {
                const customeip1193Provider = new ZeroDevEip1193Bridge(this.provider.getAccountSigner(), this.provider);
                const customTransport = custom({
                    async request({ method, params }) {
                        return customeip1193Provider.send(method, params);
                    },
                });
                const walletClient = createWalletClient({
                    account: await this.getAddress(),
                    chain: getViemNetwork(this.chain),
                    transport: customTransport,
                }).extend(publicActions);
                return walletClient as any;
            }
            default:
                logError("[GET_SIGNER] - ERROR", {
                    service: SCW_SERVICE,
                    error: errorToJSON("Invalid signer type"),
                });
                throw new Error("Invalid signer type");
        }
    }

    async verifyMessage(message: string, signature: string) {
        return verifyMessage({
            provider: this.provider,
            signer: await this.getAddress(),
            message,
            signature,
        });
    }

    setSessionKeySignerAddress(sessionKeySignerAddress: string) {
        this.sessionKeySignerAddress = sessionKeySignerAddress;
    }

    async setCustodianForTokens(tokenType?: TokenType, custodian?: Custodian) {
        try {
            logInfo("[SET_CUSTODIAN_FOR_TOKENS] - INIT", {
                service: SCW_SERVICE,
                tokenType,
                custodian,
            });
            const selector = getFunctionSelector("transferERC721Action(address, uint256, address)");

            const rpcProvider = getUrlProviderByBlockchain(this.chain);
            const jsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcProvider);
            const sessionKeySigner = jsonRpcProvider.getSigner(this.sessionKeySignerAddress);

            const erc165SessionKeyProvider = await ERC165SessionKeyProvider.init({
                projectId: getZeroDevProjectIdByBlockchain(this.chain), // ZeroDev projectId
                sessionKey: convertEthersSignerToAccountSigner(sessionKeySigner), // Session Key signer
                sessionKeyData: {
                    selector, // Function selector in the executor contract to execute
                    erc165InterfaceId: "0x80ac58cd", // Supported interfaceId of the contract the executor calls
                    validAfter: 0,
                    validUntil: 0,
                    addressOffset: 16, // Address offest of the contract called by the executor in the calldata
                },
                opts: {
                    accountConfig: {
                        accountAddress: (await this.getAddress()) as `0x${string}`,
                    },
                    validatorConfig: {
                        mode: ValidatorMode.plugin,
                        executor: constants.TOKEN_ACTION, // Address of the executor contract
                        selector, // Function selector in the executor contract to execute
                    },
                },
            });
            const enableSig = await this.provider
                .getAccountProvider()
                .getValidator()
                .approveExecutor(
                    (await this.getAddress()) as `0x${string}`,
                    selector,
                    constants.TOKEN_ACTION,
                    0,
                    0,
                    erc165SessionKeyProvider.getValidator()
                );

            const generateSessionKeyDataInput: GenerateSignatureDataInput = {
                sessionKeyData: enableSig,
                smartContractWalletAddress: await this.getAddress(),
                chain: this.chain,
                version: 0,
            };

            await this.crossmintService.generateChainData(generateSessionKeyDataInput);
            logInfo("[SET_CUSTODIAN_FOR_TOKENS] - FINISH", {
                service: SCW_SERVICE,
                tokenType,
                custodian,
            });
        } catch (error) {
            logError("[SET_CUSTODIAN_FOR_TOKENS] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                tokenType,
                custodian,
            });
            throw new Error(`Error setting custodian for tokens. If this error persists, please contact support.`);
        }
    }

    async setCustodianForKillswitch(custodian?: Custodian | undefined) {
        try {
            logInfo("[SET_CUSTODIAN_FOR_KILLSWITCH] - INIT", {
                service: SCW_SERVICE,
                custodian,
            });
            const selectorKs = getFunctionSelector("toggleKillSwitch()");

            const rpcProvider = getUrlProviderByBlockchain(this.chain);
            const jsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcProvider);
            const sessionKeySigner = jsonRpcProvider.getSigner(this.sessionKeySignerAddress);

            const blockerKillSwitchProvider = await KillSwitchProvider.init({
                projectId: getZeroDevProjectIdByBlockchain(this.chain), // zeroDev projectId
                guardian: convertEthersSignerToAccountSigner(sessionKeySigner), // Guardian signer
                delaySeconds: 1000, // Delay in seconds
                opts: {
                    accountConfig: {
                        accountAddress: (await this.getAddress()) as `0x${string}`,
                    },
                    validatorConfig: {
                        mode: ValidatorMode.plugin,
                        executor: constants.KILL_SWITCH_ACTION, // Address of the executor contract
                        selector: selectorKs, // Function selector in the executor contract to toggleKillSwitch()
                    },
                },
            });
            const enableSig = await this.provider
                .getAccountProvider()
                .getValidator()
                .approveExecutor(
                    (await this.getAddress()) as `0x${string}`,
                    selectorKs,
                    constants.KILL_SWITCH_ACTION,
                    0,
                    0,
                    blockerKillSwitchProvider.getValidator()
                );

            const generateKillSwitchDataInput: GenerateSignatureDataInput = {
                killSwitchData: enableSig,
                smartContractWalletAddress: await this.getAddress(),
                chain: this.chain,
                version: 0,
            };

            await this.crossmintService.generateChainData(generateKillSwitchDataInput);
            logInfo("[SET_CUSTODIAN_FOR_KILLSWITCH] - FINISH", {
                service: SCW_SERVICE,
                custodian,
            });
        } catch (error) {
            logError("[SET_CUSTODIAN_FOR_KILLSWITCH] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                custodian,
            });
            throw new Error(`Error setting custodian for killswitch. If this error persists, please contact support.`);
        }
    }

    async upgradeVersion() {
        try {
            logInfo("[UPGRADE_VERSION] - INIT", { service: SCW_SERVICE });
            const sessionKeys = await this.crossmintService!.createSessionKey(await this.getAddress());
            if (sessionKeys == null) {
                throw new Error("Abstract Wallet doesn't have a session key signer address");
            }

            const latestVersion = await this.crossmintService.checkVersion(await this.getAddress());
            if (latestVersion.isUpToDate) {
                return;
            }

            const versionInfo = latestVersion.latestVersion;
            if (versionInfo == null) {
                throw new Error("New version info not found");
            }

            const abstractAddress = await this.getAddress();

            let jsonRpcProviderUrl = versionInfo.providerUrl;
            if (jsonRpcProviderUrl == null && versionInfo.chainId) {
                const blockchainType = chainIdToBlockchain(versionInfo.chainId);
                jsonRpcProviderUrl = getUrlProviderByBlockchain(blockchainType!);
            }

            const jsonRpcProvider = new ethers.providers.JsonRpcProvider(jsonRpcProviderUrl);
            const sessionKeySigner = jsonRpcProvider.getSigner(sessionKeys.sessionKeySignerAddress);

            const selector = getFunctionSelector(versionInfo.method);

            const erc165SessionKeyProvider = await ERC165SessionKeyProvider.init({
                projectId: getZeroDevProjectIdByBlockchain(this.chain),
                sessionKey: convertEthersSignerToAccountSigner(sessionKeySigner),
                sessionKeyData: {
                    selector: versionInfo.selector,
                    erc165InterfaceId: versionInfo.erc165InterfaceId,
                    validAfter: versionInfo.validAfter,
                    validUntil: versionInfo.validUntil,
                    addressOffset: versionInfo.addressOffset,
                },
                opts: {
                    accountConfig: {
                        accountAddress: abstractAddress as `0x${string}`,
                    },
                    validatorConfig: {
                        mode: versionInfo.mode,
                        executor: versionInfo.executor,
                        selector: selector,
                    },
                },
            });

            const enableSig = await (this.provider.accountProvider.account as KernelSmartContractAccount)
                .getValidator()
                .approveExecutor(
                    abstractAddress as `0x${string}`,
                    versionInfo.selector,
                    versionInfo.tokenAction,
                    0,
                    0,
                    erc165SessionKeyProvider.getValidator()
                );

            await this.crossmintService.updateWallet(await this.getAddress(), enableSig, 1);
            logInfo("[UPGRADE_VERSION - FINISH", { service: SCW_SERVICE });
        } catch (error) {
            logError("[UPGRADE_VERSION] - ERROR", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
            });
            throw new Error(`Error upgrading version. If this error persists, please contact support.`);
        }
    }

    async getNFTs() {
        return this.crossmintService.fetchNFTs(await this.getAddress(), this.chain);
    }
}
