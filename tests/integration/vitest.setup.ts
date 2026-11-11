import { vi } from "vitest";

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");
    return {
        ...actual,
        SdkLogger: vi.fn().mockImplementation(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
            init: vi.fn(),
            addSink: vi.fn(),
            setContext: vi.fn(),
            flush: vi.fn(),
        })),
    };
});
