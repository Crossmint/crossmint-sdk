import { MetamaskService } from "@/services/metamaskSign";
import { WalletAuthService } from "@/services/walletAuth";
import {
    EncryptedVerifiableCredential,
    VerifiableCredential,
    isVerifiableCredential,
} from "@/verifiableCredentialsSDK";

/**
 * Class for decrypting verifiable credentials that have been encrypted with the VerifiableCredentialEncryptionType.CROSSMINT_RECOVERABLE encryption type.
 * This class will use the provided sign callback to sign a message to authenticate the user and decrypt the credential.
 * To use the crossmint decrypt endpoint an api key with the `credentials.decrypt` scope  must have been provided.
 */
export class CrossmintDecrypt {
    userAddress: string;
    signCallback: (wallet: string, challenge: string) => Promise<string>;
    constructor(
        userAddress: string,
        signCallback: (wallet: string, challenge: string) => Promise<string>,
        private readonly authService: WalletAuthService = new WalletAuthService()
    ) {
        this.userAddress = userAddress;
        this.signCallback = signCallback;
    }
    private async tryDecrypt(credential: EncryptedVerifiableCredential): Promise<any> {
        const challenge = await this.authService.getChallenge(this.userAddress);
        console.log("Waiting for signature from user");
        const payload = credential.payload + challenge;
        const signature = await this.signCallback(this.userAddress, payload);
        return this.authService.decrypt(credential, challenge, signature, this.userAddress);
    }

    async decrypt(credential: EncryptedVerifiableCredential): Promise<VerifiableCredential> {
        const vc = await this.tryDecrypt(credential);
        if (!isVerifiableCredential(vc)) {
            throw new Error("Decrypted data is not a valid Verifiable Credential");
        }
        return vc;
    }
}

/**
 * Class for decrypting verifiable credentials that have been encrypted with the VerifiableCredentialEncryptionType.CROSSMINT_RECOVERABLE encryption type.
 * This class will use metamask to prompt the user to sign a message to decrypt the credential.
 * To use a different signature method refer to the CrossmintDecrypt class.
 * To use the crossmint decrypt endpoint an api key with the `credentials.decrypt` scope  must have been provided.
 */
export class CrossmintMetamaskDecrypt {
    constructor(private readonly metamask = new MetamaskService()) {
        this.metamask.metamaskSignMessage = this.metamask.metamaskSignMessage.bind(this.metamask);
    }

    async decrypt(credential: EncryptedVerifiableCredential, wallet?: string): Promise<VerifiableCredential> {
        wallet = wallet || (await this.metamask.getConnectedWallet());
        const descryptService = new CrossmintDecrypt(wallet, this.metamask.metamaskSignMessage);
        return descryptService.decrypt(credential);
    }
}
