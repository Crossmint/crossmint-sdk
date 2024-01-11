import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import base58 from "bs58";

import { CROSSMINT_API_KEY_SIGNER_PUBLICKEY_PROD, CROSSMINT_API_KEY_SIGNER_PUBLICKEY_STAGING } from "./consts";
import { APIKeyPrefix } from "./types";
import {
    ValidateAPIKeyPrefixExpectations,
    ValidateAPIKeyPrefixSuccessData,
    validateAPIKeyPrefix,
} from "./validateAPIKeyPrefix";
import { environmentToExpectedPublicKey } from "./utils";

// Need to shim for methods to work https://www.npmjs.com/package/@noble/ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export type ValidateAPIKeyResult =
    | ({
          isValid: true;
          projectId: string;
      } & ValidateAPIKeyPrefixSuccessData)
    | {
          isValid: false;
          message: string;
      };

export function validateAPIKey(apiKey: string, expectations?: ValidateAPIKeyPrefixExpectations): ValidateAPIKeyResult {
    const prefixValidationResult = validateAPIKeyPrefix(apiKey, expectations);
    if (!prefixValidationResult.isValid) {
        return prefixValidationResult;
    }

    const { prefix } = prefixValidationResult;
    const { keyData, keyDataWithoutPrefix, signature } = decodeAPIKeyAndGetParts(apiKey, prefix);

    const isSignatureValid = validateAPIKeySignature(keyData, signature, expectations);
    if (!isSignatureValid) {
        return {
            isValid: false,
            message: "Invalid API key. Failed to validate signature",
        };
    }

    const [projectId] = keyDataWithoutPrefix.split(".");

    return {
        ...prefixValidationResult,
        projectId,
    };
}

function decodeAPIKeyAndGetParts(apiKey: string, prefix: APIKeyPrefix) {
    const base58EncodedPart = apiKey.slice(`${prefix}_`.length);

    const decodedPartUint8 = base58.decode(base58EncodedPart);
    const decodedPartString = new TextDecoder().decode(decodedPartUint8);

    const [keyDataWithoutPrefix, signature] = decodedPartString.split(":");

    const keyData = `${prefix}.${keyDataWithoutPrefix}`;

    return {
        keyData,
        keyDataWithoutPrefix,
        signature,
    };
}

function validateAPIKeySignature(keyData: string, signature: string, expectations?:ValidateAPIKeyPrefixExpectations): boolean {
    const expectedPublicKey = environmentToExpectedPublicKey(expectations?.environment);

    function _validateSignature(expectedPublicKey:string) {
        try {
            return ed.verify(
                base58.decode(signature),
                new TextEncoder().encode(keyData),
                base58.decode(expectedPublicKey)
            );
        } catch (e) {
            console.error("Failed to validate API key signature", e);
            return false;
        }
    }

    if(expectedPublicKey != null) {
        return _validateSignature(expectedPublicKey);
    }
    return _validateSignature(CROSSMINT_API_KEY_SIGNER_PUBLICKEY_PROD) || _validateSignature(CROSSMINT_API_KEY_SIGNER_PUBLICKEY_STAGING);
}
