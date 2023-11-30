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
import { getFunctionSelector } from "viem";

import { CrossmintService } from "../../api/CrossmintService";
import { GenerateSignatureDataInput } from "../../types/API";
import { ZERO_PROJECT_ID } from "../../utils/constants";
import { EVMBlockchain, getBlockchainByChainId, getUrlProviderByBlockchain } from "../BlockchainNetworks";
import { Custodian } from "../plugins";
import { TokenType } from "../token/Tokens";
import BaseWallet from "./BaseWallet";

export class EVMAAWallet<B extends EVMBlockchain = EVMBlockchain> extends BaseWallet {
    private sessionKeySignerAddress?: string;
    chain: B;

    constructor(provider: ZeroDevEthersProvider<"ECDSA">, crossmintService: CrossmintService, chain: B) {
        super(provider, crossmintService);
        this.chain = chain;
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
        const selector = getFunctionSelector("transferERC721Action(address, uint256, address)");

        const rpcProvider = getUrlProviderByBlockchain(this.chain);
        const jsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcProvider);
        const sessionKeySigner = jsonRpcProvider.getSigner(this.sessionKeySignerAddress);

        const erc165SessionKeyProvider = await ERC165SessionKeyProvider.init({
            projectId: ZERO_PROJECT_ID, // ZeroDev projectId
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
            chain: "polygon",
            version: 0,
        };

        await this.crossmintService.generateChainData(generateSessionKeyDataInput);
    }

    async setCustodianForKillswitch(custodian?: Custodian | undefined) {
        const selectorKs = getFunctionSelector("toggleKillSwitch()");

        const rpcProvider = getUrlProviderByBlockchain(this.chain);
        const jsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcProvider);
        const sessionKeySigner = jsonRpcProvider.getSigner(this.sessionKeySignerAddress);

        const blockerKillSwitchProvider = await KillSwitchProvider.init({
            projectId: ZERO_PROJECT_ID, // zeroDev projectId
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
            chain: "polygon",
            version: 0,
        };

        await this.crossmintService.generateChainData(generateKillSwitchDataInput);
    }

    async upgradeVersion() {
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
            const blockchainType = getBlockchainByChainId(versionInfo.chainId);
            jsonRpcProviderUrl = getUrlProviderByBlockchain(blockchainType!);
        }

        const jsonRpcProvider = new ethers.providers.JsonRpcProvider(jsonRpcProviderUrl);
        const sessionKeySigner = jsonRpcProvider.getSigner(sessionKeys.sessionKeySignerAddress);

        const selector = getFunctionSelector(versionInfo.method);

        const erc165SessionKeyProvider = await ERC165SessionKeyProvider.init({
            projectId: ZERO_PROJECT_ID,
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
    }

    async getNFTs() {
        return this.crossmintService.fetchNFTs(await this.getAddress());
    }
}