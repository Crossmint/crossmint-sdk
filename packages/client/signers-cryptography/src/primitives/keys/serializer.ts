import { encodeBytes, decodeBytes } from "../encoding";
import type { EncodingFormat } from "../../types";

export class PublicKeySerializer {
    static async serialize(
        publicKey: CryptoKey,
        encoding: EncodingFormat = "base64"
    ): Promise<string> {
        const keyBytes = await crypto.subtle.exportKey("raw", publicKey);
        return encodeBytes(new Uint8Array(keyBytes), encoding);
    }

    static async deserialize(
        serializedKey: string,
        encoding: EncodingFormat = "base64",
        keySpec: EcKeyImportParams = {
            name: "ECDH",
            namedCurve: "P-256",
        }
    ): Promise<CryptoKey> {
        const keyBytes = decodeBytes(serializedKey, encoding);
        return crypto.subtle.importKey("raw", keyBytes, keySpec, true, []);
    }
}
