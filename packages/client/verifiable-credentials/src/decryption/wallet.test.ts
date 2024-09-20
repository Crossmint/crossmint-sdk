import type { EncryptedVerifiableCredential } from "@/verifiableCredentialsSDK";

import { mockCredential } from "../verifiableCredentialsSDK/types/mockCredential";
import { CrossmintDecrypt } from "./wallet";

describe("WalletDecrypt", () => {
    let walletDecrypt: CrossmintDecrypt;
    let authServiceMock: any;
    let signCallbackMock: any;
    let encryptedCredentialMock: EncryptedVerifiableCredential;

    beforeEach(() => {
        authServiceMock = {
            getChallenge: jest.fn().mockResolvedValue("challenge"),
            decrypt: jest.fn().mockResolvedValue(mockCredential),
        };
        signCallbackMock = jest.fn().mockResolvedValue("signature");
        encryptedCredentialMock = { payload: "payload" } as EncryptedVerifiableCredential;
        walletDecrypt = new CrossmintDecrypt("userAddress", signCallbackMock, authServiceMock);
    });

    it("should decrypt a credential", async () => {
        const result = await walletDecrypt.decrypt(encryptedCredentialMock);
        expect(result).toEqual(mockCredential);
        expect(authServiceMock.getChallenge).toHaveBeenCalledWith("userAddress");
        expect(signCallbackMock).toHaveBeenCalledWith("userAddress", "payloadchallenge");
    });

    it("should throw error if malformed", async () => {
        authServiceMock.decrypt.mockResolvedValue("malformed");
        await expect(walletDecrypt.decrypt(encryptedCredentialMock)).rejects.toThrow(
            new Error("Decrypted data is not a valid Verifiable Credential")
        );
    });
});
