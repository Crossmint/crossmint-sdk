import { beforeEach, describe, expect, it } from "vitest";

import { SdkLogger } from "./SdkLogger";
import { sinkManager } from "./sink-manager";
import type { LogEntry, LogSink } from "./types";

const MASTER_SECRET = `xmsk1_${"0123456789abcdef".repeat(4)}`;

describe("SdkLogger secret redaction", () => {
    const entries: LogEntry[] = [];
    const captureSink: LogSink = {
        id: "capture",
        write: (entry) => {
            entries.push(entry);
        },
    };

    beforeEach(() => {
        entries.length = 0;
        sinkManager.init([captureSink]);
    });

    it.each([
        [
            "an error passed in context",
            (logger: SdkLogger) =>
                logger.error("createWallet threw", { error: new Error(`mismatch: ${MASTER_SECRET}`) }),
        ],
        [
            "an error passed as the message",
            (logger: SdkLogger) => logger.error(new Error(`mismatch: ${MASTER_SECRET}`)),
        ],
        ["a secret interpolated into the message", (logger: SdkLogger) => logger.error(`rejected ${MASTER_SECRET}`)],
    ])("delivers no secret material to sinks for %s", (_, log) => {
        const logger = new SdkLogger({ packageName: "test", platform: "server", consoleLogLevel: "silent" });

        log(logger);

        expect(entries).toHaveLength(1);
        const delivered = `${entries[0].message} ${JSON.stringify(entries[0].context)}`;
        expect(delivered).not.toContain(MASTER_SECRET.slice("xmsk1_".length));
        expect(delivered).toContain("xmsk1_[REDACTED]");
    });

    it("keeps transaction hashes logged as context fields", () => {
        const logger = new SdkLogger({ packageName: "test", platform: "server", consoleLogLevel: "silent" });
        const hash = "0123456789abcdef".repeat(4);

        logger.info("transaction sent", { hash });

        expect(entries[0].context.hash).toBe(hash);
    });
});
