import { vi } from "vitest";

const mockWalletsLogger = {
    init: vi.fn(),
    addSink: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
};

vi.mock("../../logger/init", () => ({
    walletsLogger: mockWalletsLogger,
    initWalletsLogger: vi.fn(),
}));

vi.mock("../../logger", () => ({
    walletsLogger: mockWalletsLogger,
}));

vi.mock("@crossmint/common-sdk-base", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@crossmint/common-sdk-base")>();
    const MockSdkLogger = vi.fn().mockImplementation(() => mockWalletsLogger);
    return {
        ...actual,
        WithLoggerContext: (config: any) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        isValidAddress: vi.fn((addr: string) => true),
        isValidEvmAddress: vi.fn((addr: string) => addr.startsWith("0x") && addr.length === 42),
        isValidSolanaAddress: vi.fn((addr: string) => addr.length > 30 && addr.length < 45),
        isValidStellarAddress: vi.fn((addr: string) => addr.startsWith("G") && addr.length === 56),
        SdkLogger: MockSdkLogger,
    };
});

