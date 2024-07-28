import {
    AdminAlreadyUsedError,
    CrossmintServiceError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    NonCustodialWalletsNotEnabledError,
    OutOfCreditsError,
    SmartWalletSDKError,
    UserWalletAlreadyCreatedError,
} from "@/error";

export type CrossmintAPIErrorCodes =
    | "ERROR_JWT_INVALID"
    | "ERROR_JWT_DECRYPTION"
    | "ERROR_JWT_IDENTIFIER"
    | "ERROR_JWT_EXPIRED"
    | "ERROR_USER_WALLET_ALREADY_CREATED"
    | "ERROR_ADMIN_SIGNER_ALREADY_USED"
    | "ERROR_PROJECT_NONCUSTODIAL_WALLETS_NOT_ENABLED";

export class APIErrorService {
    constructor(
        private errors: Partial<Record<CrossmintAPIErrorCodes, (apiResponse: any) => SmartWalletSDKError>> = {
            ERROR_JWT_INVALID: () => new JWTInvalidError(),
            ERROR_JWT_DECRYPTION: () => new JWTDecryptionError(),
            ERROR_JWT_EXPIRED: ({ expiredAt }: { expiredAt: string }) => new JWTExpiredError(new Date(expiredAt)),
            ERROR_JWT_IDENTIFIER: ({ identifierKey }: { identifierKey: string }) =>
                new JWTIdentifierError(identifierKey),
            ERROR_USER_WALLET_ALREADY_CREATED: ({ userId }: { userId: string }) =>
                new UserWalletAlreadyCreatedError(userId),
            ERROR_ADMIN_SIGNER_ALREADY_USED: () => new AdminAlreadyUsedError(),
            ERROR_PROJECT_NONCUSTODIAL_WALLETS_NOT_ENABLED: () => new NonCustodialWalletsNotEnabledError(),
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
            console.error("Error parsing response", e);
        }

        throw new CrossmintServiceError(await response.text(), response.status);
    }
}
