import {
    CrossmintServiceError,
    NonCustodialWalletError,
    NotAuthorizedError,
    RateLimitError,
    SignTransactionError,
    TransferError,
    WalletSdkError,
} from "./error";

describe("Error Classes", () => {
    // Test for NotAuthorizedError
    describe("NotAuthorizedError", () => {
        it("should create an instance with the correct message and code", () => {
            const error = new NotAuthorizedError("Unauthorized access");
            expect(error.message).toBe("Unauthorized access");
            expect(error.code).toBe("ERROR_NOT_AUTHORIZED");
            expect(error).toBeInstanceOf(NotAuthorizedError);
            expect(error).toBeInstanceOf(Error);
        });
        it("should not create an instance with the wrong message and code", () => {
            const error = new NotAuthorizedError("Unauthorized access");
            expect(error.message).not.toBe("Some other message");
            expect(error.code).not.toBe("SOME_OTHER_CODE");
        });
    });

    // Test for RateLimitError
    describe("RateLimitError", () => {
        it("should create an instance with the correct message and code", () => {
            const error = new RateLimitError("Too many requests", 1000);
            expect(error.message).toBe("Too many requests");
            expect(error.code).toBe("ERROR_RATE_LIMIT");
            expect(error.retryAfterMs).toBe(1000);
            expect(error).toBeInstanceOf(RateLimitError);
            expect(error).toBeInstanceOf(Error);
        });
        it("should not create an instance with the wrong message and code", () => {
            const error = new RateLimitError("Too many requests", 1000);
            expect(error.message).not.toBe("Some other message");
            expect(error.code).not.toBe("SOME_OTHER_CODE");
        });
    });

    // Test for SignTransactionError
    describe("SignTransactionError", () => {
        it("should create an instance with the correct message and code", () => {
            const error = new SignTransactionError("Error signing transaction");
            expect(error.message).toBe("Error signing transaction");
            expect(error.code).toBe("ERROR_SIGN_TRANSACTION");
            expect(error).toBeInstanceOf(SignTransactionError);
            expect(error).toBeInstanceOf(Error);
        });
        it("should not create an instance with the wrong message and code", () => {
            const error = new SignTransactionError("Error signing transaction");
            expect(error.message).not.toBe("Some other message");
            expect(error.code).not.toBe("SOME_OTHER_CODE");
        });
    });

    // Test for TransferError
    describe("TransferError", () => {
        it("should create an instance with the correct message and code", () => {
            const error = new TransferError("Error while transfer");
            expect(error.message).toBe("Error while transfer");
            expect(error.code).toBe("ERROR_TRANSFER");
            expect(error).toBeInstanceOf(TransferError);
            expect(error).toBeInstanceOf(Error);
        });
        it("should not create an instance with the wrong message and code", () => {
            const error = new TransferError("Error while transfer");
            expect(error.message).not.toBe("Some other message");
            expect(error.code).not.toBe("SOME_OTHER_CODE");
        });
    });

    // Test for CrossmintServiceError
    describe("CrossmintServiceError", () => {
        it("should create an instance with the correct message and code", () => {
            const error = new CrossmintServiceError("Crossmint Service Error");
            expect(error.message).toBe("Crossmint Service Error");
            expect(error.code).toBe("ERROR_CROSSMINT_SERVICE");
            expect(error).toBeInstanceOf(CrossmintServiceError);
            expect(error).toBeInstanceOf(Error);
        });
        it("should not create an instance with the wrong message and code", () => {
            const error = new CrossmintServiceError("Crossmint Service Error");
            expect(error.message).not.toBe("Some other message");
            expect(error.code).not.toBe("SOME_OTHER_CODE");
        });
    });

    // Test for NonCustodialWalletError
    describe("NonCustodialWalletError", () => {
        it("should create an instance with the correct message and code", () => {
            const error = new NonCustodialWalletError("Non Custodial Wallet Error");
            expect(error.message).toBe("Non Custodial Wallet Error");
            expect(error.code).toBe("ERROR_UNDEFINED");
            expect(error).toBeInstanceOf(NonCustodialWalletError);
            expect(error).toBeInstanceOf(Error);
        });
        it("should not create an instance with the wrong message and code", () => {
            const error = new NonCustodialWalletError("Non Custodial Wallet Error");
            expect(error.message).not.toBe("Some other message");
            expect(error.code).not.toBe("SOME_OTHER_CODE");
        });
    });

    // Test for WalletSdkError
    describe("WalletSdkError", () => {
        it("should create an instance with the correct message and code", () => {
            const error = new WalletSdkError("Generic SDK error");
            expect(error.message).toBe("Generic SDK error");
            expect(error.code).toBe("ERROR_UNDEFINED");
            expect(error).toBeInstanceOf(WalletSdkError);
            expect(error).toBeInstanceOf(Error);
        });
        it("should not create an instance with the wrong message and code", () => {
            const error = new WalletSdkError("Generic SDK error");
            expect(error.message).not.toBe("Some other message");
            expect(error.code).not.toBe("SOME_OTHER_CODE");
        });
    });
});
