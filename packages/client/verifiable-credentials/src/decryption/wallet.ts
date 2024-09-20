import { MetamaskService } from "@/services/metamaskSign";
import { WalletAuthService } from "@/services/walletAuth";
import {
    type EncryptedVerifiableCredential,
    type VerifiableCredential,
    isVerifiableCredential,
} from "@/verifiableCredentialsSDK";

/**
 * Class for decrypting verifiable credentials that have been encrypted with the `VerifiableCredentialEncryptionType.CROSSMINT_RECOVERABLE` encryption type.
 *
 * This class uses a provided signature callback to authenticate the user and decrypt the credential.
 * To use the Crossmint decrypt endpoint, an API key with the `credentials.decrypt` scope must be provided.
 */
export class CrossmintDecrypt {
    userAddress: string;

    /**
     * A callback function that signs the challenge with the user's wallet.
     * @param wallet - The user's wallet address.
     * @param challenge - The challenge string that needs to be signed.
     * @returns A promise that resolves to the signature string.
     */
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

    /**
     * Decrypts an encrypted verifiable credential.
     *
     * This method validates the decrypted data to ensure it is a valid verifiable credential.
     *
     * @param credential - The encrypted verifiable credential to decrypt.
     * @returns A promise that resolves to a `VerifiableCredential`.
     *
     * @throws Will throw an error if the decrypted data is not a valid verifiable credential.
     */
    async decrypt(credential: EncryptedVerifiableCredential): Promise<VerifiableCredential> {
        const vc = await this.tryDecrypt(credential);
        if (!isVerifiableCredential(vc)) {
            throw new Error("Decrypted data is not a valid Verifiable Credential");
        }
        return vc;
    }
}

/**
 * Class for decrypting verifiable credentials encrypted with the `VerifiableCredentialEncryptionType.CROSSMINT_RECOVERABLE` encryption type using Metamask.
 *
 * This class uses Metamask to prompt the user to sign a message to decrypt the credential.
 * If you want to use a different signature method, refer to the `CrossmintDecrypt` class.
 * To use the Crossmint decrypt endpoint, an API key with the `credentials.decrypt` scope must be provided.
 */
export class CrossmintMetamaskDecrypt {
    constructor(private readonly metamask = new MetamaskService()) {
        this.metamask.metamaskSignMessage = this.metamask.metamaskSignMessage.bind(this.metamask);
    }

    /**
     * Decrypts an encrypted verifiable credential using Metamask.
     *
     * This method prompts the user via Metamask to sign the necessary message for decrypting the credential.
     *
     * @param credential - The encrypted verifiable credential to decrypt.
     * @param wallet - (Optional) The user's wallet address. If not provided, the connected wallet address from Metamask will be used.
     * @returns A promise that resolves to a `VerifiableCredential`.
     *
     * @throws Will throw an error if decryption fails or if Metamask is not properly configured.
     */
    async decrypt(credential: EncryptedVerifiableCredential, wallet?: string): Promise<VerifiableCredential> {
        wallet = wallet || (await this.metamask.getConnectedWallet());
        const descryptService = new CrossmintDecrypt(wallet, this.metamask.metamaskSignMessage);
        return descryptService.decrypt(credential);
    }
}
