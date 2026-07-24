import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";

import { CrossmintTreasury, TREASURY_API_VERSION } from "./CrossmintTreasury";
import { CrossmintTreasuryError } from "./errors";

vi.mock("@crossmint/common-sdk-base");

function makeResponse(body: unknown, init: { status?: number; statusText?: string } = {}): Response {
    return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        statusText: init.statusText ?? "OK",
        headers: { "content-type": "application/json" },
    });
}

describe("CrossmintTreasury", () => {
    const mockCrossmint = { projectId: "test-project-id", apiKey: "sk_staging_xxx" } as unknown as Crossmint;
    const apiClient = {
        baseUrl: "https://staging.crossmint.com",
        get: vi.fn(),
        post: vi.fn(),
    };
    let treasury: CrossmintTreasury;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(CrossmintApiClient).mockReturnValue(apiClient as unknown as CrossmintApiClient);
        treasury = CrossmintTreasury.from(mockCrossmint, { idempotencyKeyFn: () => "test-idem-key" });
    });

    describe("createPayout", () => {
        it("POSTs to the dated treasury/payouts path with an Idempotency-Key header", async () => {
            apiClient.post.mockResolvedValueOnce(
                makeResponse({
                    id: "payout-1",
                    status: "pending",
                    amount: { value: "10", currency: "usdc" },
                    destination: { type: "wallet", chain: "polygon", walletAddress: "0xabc" },
                    region: "us",
                    vendor: "hifi",
                    createdAt: "2026-05-13T00:00:00Z",
                    updatedAt: "2026-05-13T00:00:00Z",
                })
            );

            const result = await treasury.createPayout({
                amount: { value: "10", currency: "usdc" },
                destination: { type: "wallet", chain: "polygon", walletAddress: "0xabc" },
            });

            expect(apiClient.post).toHaveBeenCalledWith(
                `api/${TREASURY_API_VERSION}/treasury/payouts`,
                expect.objectContaining({
                    headers: expect.objectContaining({ "Idempotency-Key": "test-idem-key" }),
                    body: expect.any(String),
                })
            );
            expect(result.id).toBe("payout-1");
            expect(result.status).toBe("pending");
        });

        it("honors caller-supplied idempotency key over the auto-generated default", async () => {
            apiClient.post.mockResolvedValueOnce(makeResponse({ id: "payout-2", status: "completed" }));

            await treasury.createPayout(
                {
                    amount: { value: "5", currency: "usdc" },
                    destination: { type: "wallet", chain: "polygon", walletAddress: "0xdef" },
                },
                { idempotencyKey: "caller-supplied-key" }
            );

            expect(apiClient.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({ "Idempotency-Key": "caller-supplied-key" }),
                })
            );
        });
    });

    describe("getPayout", () => {
        it("GETs the payout by id with URL-encoded path segment", async () => {
            apiClient.get.mockResolvedValueOnce(makeResponse({ id: "payout-3", status: "completed" }));

            await treasury.getPayout("payout 3 with spaces");

            expect(apiClient.get).toHaveBeenCalledWith(
                `api/${TREASURY_API_VERSION}/treasury/payouts/${encodeURIComponent("payout 3 with spaces")}`,
                expect.any(Object)
            );
        });
    });

    describe("createOfframp", () => {
        it("POSTs to treasury/offramps with the request body + idempotency-key", async () => {
            apiClient.post.mockResolvedValueOnce(
                makeResponse({
                    id: "off-1",
                    status: "pending",
                    amount: { value: "100", currency: "usdc" },
                    destinationAccountId: "acc-1",
                    sourceChain: "polygon",
                    region: "us",
                    vendor: "hifi",
                    createdAt: "2026-05-13T00:00:00Z",
                    updatedAt: "2026-05-13T00:00:00Z",
                })
            );

            const result = await treasury.createOfframp({
                amount: { value: "100", currency: "usdc" },
                destinationAccountId: "acc-1",
                sourceChain: "polygon",
            });

            expect(apiClient.post).toHaveBeenCalledWith(
                `api/${TREASURY_API_VERSION}/treasury/offramps`,
                expect.objectContaining({
                    headers: expect.objectContaining({ "Idempotency-Key": "test-idem-key" }),
                })
            );
            expect(result.id).toBe("off-1");
        });
    });

    describe("registerHifiOfframpAccount", () => {
        it("POSTs to treasury/offramp-accounts (HiFi rail)", async () => {
            apiClient.post.mockResolvedValueOnce(
                makeResponse({
                    id: "acc-1",
                    bankName: "Acme Bank",
                    last4: "7890",
                    transferType: "ach",
                    accountType: "Checking",
                    currency: "usd",
                    status: "active",
                })
            );

            const result = await treasury.registerHifiOfframpAccount({
                transferType: "ach",
                accountType: "Checking",
                accountNumber: "1234567890",
                routingNumber: "021000021",
                bankName: "Acme Bank",
                accountHolderName: "Acme Inc",
                address: {
                    addressLine1: "1 Main",
                    city: "NYC",
                    stateProvinceRegion: "NY",
                    postalCode: "10001",
                    country: "US",
                },
            });

            expect(apiClient.post).toHaveBeenCalledWith(
                `api/${TREASURY_API_VERSION}/treasury/offramp-accounts`,
                expect.any(Object)
            );
            expect(result.last4).toBe("7890");
        });
    });

    describe("registerOpenPaydBeneficiary", () => {
        it("POSTs to treasury/beneficiaries (OpenPayd rail)", async () => {
            apiClient.post.mockResolvedValueOnce(
                makeResponse({
                    id: "ben-1",
                    bankAccountHolderName: "Acme EU GmbH",
                    bankAccountCountry: "DE",
                    currency: "EUR",
                    last4: "3000",
                    bic: "COBADEFFXXX",
                    status: "active",
                })
            );

            const result = await treasury.registerOpenPaydBeneficiary({
                bankAccountHolderName: "Acme EU GmbH",
                bankAccountCountry: "DE",
                currency: "EUR",
                iban: "DE89370400440532013000",
                bic: "COBADEFFXXX",
            });

            expect(result.id).toBe("ben-1");
        });
    });

    describe("listTransactions", () => {
        it("passes kind/limit/cursor as query params", async () => {
            apiClient.get.mockResolvedValueOnce(makeResponse({ items: [] }));

            await treasury.listTransactions({ kind: "payout", limit: 50, cursor: "abc" });

            expect(apiClient.get).toHaveBeenCalledWith(
                `api/${TREASURY_API_VERSION}/treasury/transactions?kind=payout&limit=50&cursor=abc`,
                expect.any(Object)
            );
        });

        it("omits the query string entirely when no filters are passed", async () => {
            apiClient.get.mockResolvedValueOnce(makeResponse({ items: [] }));

            await treasury.listTransactions();

            expect(apiClient.get).toHaveBeenCalledWith(
                `api/${TREASURY_API_VERSION}/treasury/transactions`,
                expect.any(Object)
            );
        });
    });

    describe("error handling", () => {
        it("throws CrossmintTreasuryError with code + status on 4xx", async () => {
            apiClient.post.mockResolvedValueOnce(
                makeResponse(
                    {
                        code: "treasury.idempotency.in_flight",
                        message: "Concurrent request with same Idempotency-Key is still processing",
                    },
                    { status: 409, statusText: "Conflict" }
                )
            );

            await expect(
                treasury.createPayout({
                    amount: { value: "1", currency: "usdc" },
                    destination: { type: "wallet", chain: "polygon", walletAddress: "0x" },
                })
            ).rejects.toMatchObject({
                name: "CrossmintTreasuryError",
                code: "treasury.idempotency.in_flight",
                status: 409,
            });
        });

        it("surfaces a generic code when the error body is not JSON", async () => {
            apiClient.post.mockResolvedValueOnce(
                new Response("<html>502 Bad Gateway</html>", {
                    status: 502,
                    statusText: "Bad Gateway",
                    headers: { "content-type": "text/html" },
                })
            );

            try {
                await treasury.createPayout({
                    amount: { value: "1", currency: "usdc" },
                    destination: { type: "wallet", chain: "polygon", walletAddress: "0x" },
                });
                expect.fail("should have thrown");
            } catch (err) {
                expect(err).toBeInstanceOf(CrossmintTreasuryError);
                expect((err as CrossmintTreasuryError).code).toBe("treasury.unknown_error");
                expect((err as CrossmintTreasuryError).status).toBe(502);
            }
        });

        it("preserves the raw error payload on the thrown error for advanced inspection", async () => {
            apiClient.post.mockResolvedValueOnce(
                makeResponse(
                    {
                        code: "treasury.offramp.eu_workflow_pending",
                        message: "EU offramp service layer is ready; Temporal workflow + on-chain executor wiring lands in 9.2-apps",
                        region: "eu",
                        vendor: "openpayd",
                    },
                    { status: 501 }
                )
            );

            try {
                await treasury.createOfframp({
                    amount: { value: "100", currency: "usdc" },
                    destinationAccountId: "ben-1",
                    sourceChain: "polygon",
                });
                expect.fail("should have thrown");
            } catch (err) {
                expect(err).toBeInstanceOf(CrossmintTreasuryError);
                expect((err as CrossmintTreasuryError).code).toBe("treasury.offramp.eu_workflow_pending");
                expect((err as CrossmintTreasuryError).raw).toMatchObject({ region: "eu", vendor: "openpayd" });
            }
        });
    });
});
