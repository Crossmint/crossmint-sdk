import {
    BrowserLocalStorageProvider,
    ISecureStorageProvider,
    TReleaseSecureStorageCallback,
    decryptAesGCM,
    encryptAesGCM,
} from "@fireblocks/ncw-js-sdk";
import { md } from "node-forge";

export type GetUserPasswordFunc = () => string;

/// This secure storage implementations creates an encryption key on-demand based on a user password

export class PasswordEncryptedLocalStorage extends BrowserLocalStorageProvider implements ISecureStorageProvider {
    private encKey: string | null = null;

    constructor(
        private _salt: string,
        private getPassword: GetUserPasswordFunc
    ) {
        super();
    }

    public async getAccess(): Promise<TReleaseSecureStorageCallback> {
        this.encKey = await this._generateEncryptionKey();
        return async () => {
            await this._release();
        };
    }

    private async _release(): Promise<void> {
        this.encKey = null;
    }

    public async get(key: string): Promise<string | null> {
        if (!this.encKey) {
            throw new Error("Storage locked");
        }

        const encryptedData = await super.get(key);
        if (!encryptedData) {
            return null;
        }

        return decryptAesGCM(encryptedData, this.encKey, this._salt);
    }

    public async set(key: string, data: string): Promise<void> {
        if (!this.encKey) {
            throw new Error("Storage locked");
        }

        const encryptedData = await encryptAesGCM(data, this.encKey, this._salt);
        await super.set(key, encryptedData);
    }

    private async _generateEncryptionKey(): Promise<string> {
        let key = await this.getPassword();
        const md5 = md.md5.create();

        for (let i = 0; i < 1000; ++i) {
            md5.update(key);
            key = md5.digest().toHex();
        }

        return key;
    }
}
