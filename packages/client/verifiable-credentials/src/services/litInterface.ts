import * as LitJsSdk from "@lit-protocol/lit-node-client";

const chain = "polygon";

export class Lit {
    private litNodeClient: any;
    public authSig: any;

    async connect() {
        const client = new LitJsSdk.LitNodeClient({
            alertWhenUnauthorized: false,
            litNetwork: "cayenne",
        });
        await client.connect();
        this.litNodeClient = client;
    }

    async decrypt(base64Ciphertext: string) {
        if (!this.litNodeClient) {
            await this.connect();
        }

        if (!this.authSig) {
            this.authSig = await LitJsSdk.checkAndSignAuthMessage({ chain });
        }

        const ciphertext = LitJsSdk.base64StringToBlob(base64Ciphertext);
        const decryptedData = await LitJsSdk.decryptZipFileWithMetadata({
            authSig: this.authSig,
            file: ciphertext as any,
            litNodeClient: this.litNodeClient,
        });

        if (!decryptedData?.decryptedFile) {
            throw new Error("Failed to decrypt file");
        }

        const decryptedObj = LitJsSdk.uint8arrayToString(decryptedData?.decryptedFile);
        return decryptedObj;
    }
}
