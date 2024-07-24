import {
    CrossmintServiceError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    type SmartWalletSDKError,
} from "@/types/Error";

export type CrossmintAPIErrorCodes =
    | "ERROR_JWT_INVALID"
    | "ERROR_JWT_DECRYPTION"
    | "ERROR_JWT_IDENTIFIER"
    | "ERROR_JWT_EXPIRED";

export class APIErrorService {
    constructor(
        private errors: Partial<
            Record<
                CrossmintAPIErrorCodes,
                // biome-ignore lint/suspicious/noExplicitAny: we should be able to use 'any' when ingesting JSON from external sources
                (apiResponse: any) => SmartWalletSDKError
            >
        > = {
            ERROR_JWT_INVALID: () => new JWTInvalidError(),
            ERROR_JWT_DECRYPTION: () => new JWTDecryptionError(),
            ERROR_JWT_EXPIRED: ({ expiredAt }: { expiredAt: string }) => new JWTExpiredError(new Date(expiredAt)),
            ERROR_JWT_IDENTIFIER: ({ identifierKey }: { identifierKey: string }) =>
                new JWTIdentifierError(identifierKey),
        }
    ) {}

    async throwErrorFromResponse({
        response,
        onServerErrorMessage,
    }: {
        response: Response;
        onServerErrorMessage: string;
    }) {
        if (response.ok) {
            return;
        }

        if (response.status >= 500) {
            throw new CrossmintServiceError(onServerErrorMessage, response.status);
        }

        try {
            const body = await response.json();
            const code = body.code as CrossmintAPIErrorCodes | undefined;
            if (code != null && this.errors[code] != null) {
                const error = this.errors[code](body);
                throw error;
            }
            if (body.message != null) {
                throw new CrossmintServiceError(body.message, response.status);
            }
        } catch (e) {
            console.error("Error parsing response", e);
        }

        throw new CrossmintServiceError(await response.text(), response.status);
    }
}
