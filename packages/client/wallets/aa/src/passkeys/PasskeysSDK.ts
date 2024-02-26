import { logError, logInfo, logWarn } from "@/services/logging";
import type { PasskeyCipher, PasskeysSDKInitParams } from "@/types";
import { PasskeySdkError, SCW_SERVICE, errorToJSON } from "@/utils";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { CrossmintPasskeyService } from "./services/CrossmintPasskeyService";
import { LitService } from "./services/LitService";

export class PasskeysSDK {
    crossmintService: CrossmintPasskeyService;
    litService: LitService;

    constructor(crossmintService: CrossmintPasskeyService, litService: LitService) {
        this.crossmintService = crossmintService;
        this.litService = litService;
    }

    static init(params: PasskeysSDKInitParams): PasskeysSDK {
        return new PasskeysSDK(new CrossmintPasskeyService(params.apiKey), new LitService());
    }

    async signUp(chain: BlockchainIncludingTestnet, walletAddress: string) {
        try {
            if (await this.checkCiphersExist(chain, walletAddress)) {
                logWarn("[SIGN_UP] - PKP and/or Secrets alreay exist. Skipping sign up.", { chain, walletAddress });
                return;
            }

            const { pkpEthAddress, pkpPublicKey } = await this.litService.registerWithWebAuthn(
                `${chain}:${walletAddress}`
            );
            await this.savePKP(chain, walletAddress, pkpEthAddress, pkpPublicKey);

            logInfo("[PASSKEYS_SIGN_UP] - FINISH", {
                service: SCW_SERVICE,
                chain,
                walletAddress,
                pkpEthAddress,
                pkpPublicKey,
            });
            return { pkpEthAddress, pkpPublicKey };
        } catch (error: any) {
            logError("[PASSKEYS_SIGN_UP] - ERROR_SIGNING_UP", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                chain,
                walletAddress,
            });
            throw new PasskeySdkError(`Error signing up [${error?.name ?? ""}]`);
        }
    }

    async encrypt(chain: BlockchainIncludingTestnet, walletAddress: string, secretToEncrypt: string) {
        try {
            const ciphers = await this.getPasskeyCiphers(chain, walletAddress);
            if (this.checkSecretAlreadyCreated(ciphers)) {
                logWarn("[PASSKEYS_ENCRYPT] - Secret already created. Skipping...", { chain, walletAddress });
                return;
            }

            let pkpEthAddres, pkpPublicKey;
            if (!this.checkPPKAlreadyMinted(ciphers)) {
                const response = await this.signUp(chain, walletAddress);
                pkpEthAddres = response?.pkpEthAddress;
                pkpPublicKey = response?.pkpPublicKey;
            } else {
                pkpEthAddres = ciphers.cipher.data.pkpEthAddress;
                pkpPublicKey = ciphers.cipher.data.pkpPublicKey;
            }

            const capacityDelegationAuthSig = await this.crossmintService.getCapacityCreditsOwnerSignature();
            const { ciphertext, dataToEncryptHash } = await this.litService.encrypt({
                messageToEncrypt: secretToEncrypt,
                pkpPublicKey: pkpPublicKey!,
                pkpEthAddress: pkpEthAddres!,
                capacityDelegationAuthSig,
            });
            await this.saveCypherText(chain, walletAddress, ciphertext, dataToEncryptHash);

            logInfo("[PASSKEYS_ENCRYPT] - FINISH", { service: SCW_SERVICE, chain, walletAddress });
            return { ciphertext, dataToEncryptHash };
        } catch (error: any) {
            logError("[PASSKEYS_ENCRYPT] - ERROR_ENCRYPTING", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                chain,
                walletAddress,
            });
            throw new PasskeySdkError(`Error encrypting message [${error?.name ?? ""}]`);
        }
    }

    async decrypt(chain: BlockchainIncludingTestnet, walletAddress: string) {
        try {
            const ciphers = await this.getPasskeyCiphers(chain, walletAddress);
            if (!this.checkPPKAlreadyMinted(ciphers)) {
                logWarn("[PASSKEYS_DECRYPT] - PKP not minted. Please sign up first.", { chain, walletAddress });
                return;
            }

            if (!this.checkSecretAlreadyCreated(ciphers)) {
                logWarn("[PASSKEYS_DECRYPT] - Secret not created. Please create one first.", { chain, walletAddress });
                return;
            }
            const capacityDelegationAuthSig = await this.crossmintService.getCapacityCreditsOwnerSignature();
            const decryptedString = await this.litService.decrypt({
                pkpPublicKey: ciphers.cipher.data.pkpPublicKey!,
                pkpEthAddress: ciphers.cipher.data.pkpEthAddress!,
                cipherText: ciphers.cipher.data.cipherText!,
                dataToEncryptHash: ciphers.cipher.data.dataToEncryptHash!,
                capacityDelegationAuthSig,
            });

            logInfo("[PASSKEYS_DECRYPT] - FINISH", { service: SCW_SERVICE, chain, walletAddress });
            return decryptedString;
        } catch (error: any) {
            logError("[PASSKEYS_DECRYPT] - ERROR_DECRYPTING", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                chain,
                walletAddress,
            });

            throw new PasskeySdkError(`Error decrypting message [${error?.name ?? ""}]`);
        }
    }

    private async getPasskeyCiphers(chain: BlockchainIncludingTestnet, walletAddress: string) {
        return this.crossmintService.getPasskeyCiphers(`${chain}:${walletAddress}`);
    }

    private async checkCiphersExist(chain: BlockchainIncludingTestnet, walletAddress: string) {
        const response = await this.getPasskeyCiphers(chain, walletAddress);
        return this.checkPPKAlreadyMinted(response) || this.checkSecretAlreadyCreated(response);
    }

    private checkPPKAlreadyMinted(cipher: PasskeyCipher) {
        return (
            cipher != null &&
            cipher.cipher != null &&
            cipher.cipher.data != null &&
            cipher.cipher.data.pkpEthAddress != null &&
            cipher.cipher.data.pkpPublicKey != null
        );
    }

    private checkSecretAlreadyCreated(cipher: PasskeyCipher) {
        return (
            cipher != null &&
            cipher.cipher.data != null &&
            cipher.cipher.data.cipherText != null &&
            cipher.cipher.data.dataToEncryptHash != null
        );
    }

    private async savePKP(
        chain: BlockchainIncludingTestnet,
        walletAddress: string,
        pkpEthAddress: string,
        pkpPublicKey: string
    ) {
        await this.crossmintService.upsertPasskeyCiphers(`${chain}:${walletAddress}`, {
            chain: chain,
            walletAddress: walletAddress,
            cipherMethod: "lit_protocol",
            cipherData: {
                pkpEthAddress: pkpEthAddress,
                pkpPublicKey: pkpPublicKey,
            },
        });
    }

    private async saveCypherText(
        chain: BlockchainIncludingTestnet,
        walletAddress: string,
        cipherText: string,
        dataToEncryptHash: string
    ) {
        await this.crossmintService.upsertPasskeyCiphers(`${chain}:${walletAddress}`, {
            chain: chain,
            walletAddress: walletAddress,
            cipherMethod: "lit_protocol",
            cipherData: {
                cipherText: cipherText,
                dataToEncryptHash: dataToEncryptHash,
            },
        });
    }
}
