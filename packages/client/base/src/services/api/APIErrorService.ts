import {
    CrossmintSDKError,
    CrossmintServiceError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    OutOfCreditsError,
} from "../../error";

export type CrossmintAPIErrorCodes =
    | "ERROR_JWT_INVALID"
    | "ERROR_JWT_DECRYPTION"
    | "ERROR_JWT_IDENTIFIER"
    | "ERROR_JWT_EXPIRED";

export class APIErrorService<PackageErrorCodes extends string> {
    constructor(
        private packageErrors: Record<PackageErrorCodes, (apiResponse: any) => CrossmintSDKError>,
        private baseErrors: Record<CrossmintAPIErrorCodes, (apiResponse: any) => CrossmintSDKError> = {
            ERROR_JWT_INVALID: () => new JWTInvalidError(),
            ERROR_JWT_DECRYPTION: () => new JWTDecryptionError(),
            ERROR_JWT_EXPIRED: ({ expiredAt }: { expiredAt: string }) => new JWTExpiredError(new Date(expiredAt)),
            ERROR_JWT_IDENTIFIER: ({ identifierKey }: { identifierKey: string }) =>
                new JWTIdentifierError(identifierKey),
        }
    ) {}

    private get errors() {
        return {
            ...this.baseErrors,
            ...this.packageErrors,
        };
    }

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

        if (response.status === 402) {
            throw new OutOfCreditsError();
        }

        try {
            const body = await response.json();
            const code = body.code as CrossmintAPIErrorCodes | undefined;
            if (code != null && this.errors[code] != null) {
                throw this.errors[code](body);
            }
            if (body.message != null) {
                throw new CrossmintServiceError(body.message, response.status);
            }
        } catch (e) {
            if (e instanceof CrossmintSDKError) {
                throw e;
            }
            console.error("Error parsing response", e);
        }

        throw new CrossmintServiceError(await response.text(), response.status);
    }
}
