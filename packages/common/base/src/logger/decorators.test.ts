import { describe, expect, it, vi } from "vitest";
import { WithLoggerContext } from "./decorators";
import { SdkLogger } from "./SdkLogger";

class ExpectedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ExpectedError";
    }
}

class UnexpectedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnexpectedError";
    }
}

function createMockLogger() {
    const logger = new SdkLogger({ packageName: "test" });
    logger.warn = vi.fn();
    logger.error = vi.fn();
    logger.info = vi.fn();
    logger.debug = vi.fn();
    return logger;
}

describe("WithLoggerContext", () => {
    describe("expectedErrors", () => {
        it("logs expected errors at warn level", async () => {
            const logger = createMockLogger();

            class Subject {
                @WithLoggerContext({
                    logger,
                    methodName: "subject.method",
                    expectedErrors: [ExpectedError],
                })
                async doWork(): Promise<void> {
                    throw new ExpectedError("not found");
                }
            }

            const subject = new Subject();
            await expect(subject.doWork()).rejects.toThrow("not found");

            expect(logger.warn).toHaveBeenCalledWith("subject.method threw an error", {
                error: expect.any(ExpectedError),
            });
            expect(logger.error).not.toHaveBeenCalledWith("subject.method threw an error", expect.anything());
        });

        it("logs unexpected errors at error level", async () => {
            const logger = createMockLogger();

            class Subject {
                @WithLoggerContext({
                    logger,
                    methodName: "subject.method",
                    expectedErrors: [ExpectedError],
                })
                async doWork(): Promise<void> {
                    throw new UnexpectedError("boom");
                }
            }

            const subject = new Subject();
            await expect(subject.doWork()).rejects.toThrow("boom");

            expect(logger.error).toHaveBeenCalledWith("subject.method threw an error", {
                error: expect.any(UnexpectedError),
            });
            expect(logger.warn).not.toHaveBeenCalledWith("subject.method threw an error", expect.anything());
        });

        it("logs all errors at error level when expectedErrors is omitted", async () => {
            const logger = createMockLogger();

            class Subject {
                @WithLoggerContext({
                    logger,
                    methodName: "subject.method",
                })
                async doWork(): Promise<void> {
                    throw new ExpectedError("not found");
                }
            }

            const subject = new Subject();
            await expect(subject.doWork()).rejects.toThrow("not found");

            expect(logger.error).toHaveBeenCalledWith("subject.method threw an error", {
                error: expect.any(ExpectedError),
            });
            expect(logger.warn).not.toHaveBeenCalledWith("subject.method threw an error", expect.anything());
        });

        it("still rethrows the error in all cases", async () => {
            const logger = createMockLogger();

            class Subject {
                @WithLoggerContext({
                    logger,
                    methodName: "subject.method",
                    expectedErrors: [ExpectedError],
                })
                async doWork(err: Error): Promise<void> {
                    throw err;
                }
            }

            const subject = new Subject();
            const expected = new ExpectedError("expected");
            const unexpected = new UnexpectedError("unexpected");

            await expect(subject.doWork(expected)).rejects.toBe(expected);
            await expect(subject.doWork(unexpected)).rejects.toBe(unexpected);
        });

        it("handles sync methods that throw expected errors", () => {
            const logger = createMockLogger();

            class Subject {
                @WithLoggerContext({
                    logger,
                    methodName: "subject.syncMethod",
                    expectedErrors: [ExpectedError],
                })
                doWorkSync(): void {
                    throw new ExpectedError("sync not found");
                }
            }

            const subject = new Subject();
            expect(() => subject.doWorkSync()).toThrow("sync not found");

            expect(logger.warn).toHaveBeenCalledWith("subject.syncMethod threw an error", {
                error: expect.any(ExpectedError),
            });
            expect(logger.error).not.toHaveBeenCalledWith("subject.syncMethod threw an error", expect.anything());
        });
    });
});
