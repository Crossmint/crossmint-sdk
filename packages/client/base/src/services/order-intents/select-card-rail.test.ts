import { describe, expect, test } from "vitest";

import type {
    OrderIntentAgenticTokenRail,
    OrderIntentEncryptedCardRail,
    OrderIntentRail,
    OrderIntentSptRail,
} from "@/types/payment-method-management/OrderIntents";
import { findCardRail, selectCardRail, toAgentCardRail } from "./selectCardRail";

function vic(
    status: OrderIntentAgenticTokenRail["status"],
    formats: OrderIntentAgenticTokenRail["credentialFormats"] = ["card"]
) {
    return agentic("vic", status, formats);
}

function agentpay(status: OrderIntentAgenticTokenRail["status"]) {
    return agentic("agentpay", status, ["card"]);
}

function agentic(
    provider: OrderIntentAgenticTokenRail["provider"],
    status: OrderIntentAgenticTokenRail["status"],
    credentialFormats: OrderIntentAgenticTokenRail["credentialFormats"]
): OrderIntentAgenticTokenRail {
    if (status === "error") {
        return { rail: "agentic-token", provider, status, error: { code: "provider_declined" }, credentialFormats };
    }
    return { rail: "agentic-token", provider, status, credentialFormats };
}

function encryptedCard(status: OrderIntentEncryptedCardRail["status"] = "active"): OrderIntentEncryptedCardRail {
    if (status === "error") {
        return { rail: "encrypted-card", status, error: { code: "vault-unavailable" }, credentialFormats: ["card"] };
    }
    return { rail: "encrypted-card", status, credentialFormats: ["card"] };
}

const spt: OrderIntentSptRail = {
    rail: "spt",
    provider: "stripe",
    status: "active",
    credentialFormats: ["identifier"],
};

describe("selectCardRail", () => {
    describe("when vic is active", () => {
        test("picks vic", () => {
            expect(selectCardRail([spt, agentpay("active"), vic("active")])).toEqual(vic("active"));
        });
    });

    describe("when vic is pending verification and agentpay is active", () => {
        test("picks the active agentpay, as the server does, instead of making the buyer verify vic", () => {
            expect(selectCardRail([agentpay("active"), vic("pending_verification")])).toEqual(agentpay("active"));
        });
    });

    describe("when nothing is active", () => {
        test("falls back to the first pending rail the buyer can complete, in preference order", () => {
            expect(selectCardRail([encryptedCard("pending_cvc_recollection"), vic("pending_verification")])).toEqual(
                vic("pending_verification")
            );
        });

        test("skips a pending_verification rail when the caller cannot verify, and takes the CVC refresh instead", () => {
            const rails: OrderIntentRail[] = [vic("pending_verification"), encryptedCard("pending_cvc_recollection")];

            expect(selectCardRail(rails, { canVerify: false })).toEqual(encryptedCard("pending_cvc_recollection"));
        });

        test("returns null when the only pending rail needs a verification the caller cannot run", () => {
            expect(selectCardRail([vic("pending_verification")], { canVerify: false })).toBeNull();
        });

        test("prefers an active encrypted-card over a pending vic", () => {
            expect(selectCardRail([vic("pending_verification"), encryptedCard()])).toEqual(encryptedCard());
        });
    });

    describe("when vic is in error and agentpay is active", () => {
        test("falls through to agentpay", () => {
            expect(selectCardRail([vic("error"), agentpay("active")])).toEqual(agentpay("active"));
        });
    });

    describe("when vic cannot mint a card credential", () => {
        test("skips a vic rail whose credential formats lack card", () => {
            expect(selectCardRail([vic("active", ["network-token"]), agentpay("active")])).toEqual(agentpay("active"));
        });
    });

    describe("when agentpay cannot mint a card credential", () => {
        test("skips an agentpay rail whose credential formats lack card", () => {
            expect(selectCardRail([agentic("agentpay", "active", ["network-token"]), encryptedCard()])).toEqual(
                encryptedCard()
            );
        });
    });

    describe("when only spt is present", () => {
        test("returns null, since spt is not a card rail", () => {
            expect(selectCardRail([spt])).toBeNull();
        });
    });

    describe("when only encrypted-card is present", () => {
        test("picks encrypted-card", () => {
            expect(selectCardRail([spt, encryptedCard()])).toEqual(encryptedCard());
        });

        test("keeps an encrypted-card rail that is waiting for a CVC refresh", () => {
            expect(selectCardRail([encryptedCard("pending_cvc_recollection")])).toEqual(
                encryptedCard("pending_cvc_recollection")
            );
        });
    });

    describe("when every card-capable rail is in error", () => {
        test("returns null", () => {
            expect(selectCardRail([vic("error"), agentpay("error"), encryptedCard("error"), spt])).toBeNull();
        });
    });

    test("ignores the order the server lists the rails in", () => {
        const rails: OrderIntentRail[] = [encryptedCard(), agentpay("active"), vic("active")];

        expect(selectCardRail(rails)).toEqual(vic("active"));
        expect(selectCardRail([...rails].reverse())).toEqual(vic("active"));
    });

    test("returns null for an order intent with no rails", () => {
        expect(selectCardRail([])).toBeNull();
    });
});

describe("toAgentCardRail", () => {
    test("keeps the provider of an agentic-token rail and drops everything else", () => {
        expect(toAgentCardRail(vic("active"))).toEqual({ rail: "agentic-token", provider: "vic" });
    });

    test("reports encrypted-card without a provider", () => {
        expect(toAgentCardRail(encryptedCard())).toEqual({ rail: "encrypted-card" });
    });
});

describe("findCardRail", () => {
    test("finds the same rail again in a re-read order intent, whatever its new status", () => {
        const reread: OrderIntentRail[] = [agentpay("active"), vic("active")];

        expect(findCardRail(reread, { rail: "agentic-token", provider: "vic" })).toEqual(vic("active"));
    });

    test("does not confuse two agentic-token providers", () => {
        expect(findCardRail([agentpay("active")], { rail: "agentic-token", provider: "vic" })).toBeNull();
    });

    test("finds an encrypted-card rail", () => {
        expect(findCardRail([spt, encryptedCard()], { rail: "encrypted-card" })).toEqual(encryptedCard());
    });

    test("does not return a rail that lost its card credential format", () => {
        expect(findCardRail([vic("active", ["network-token"])], { rail: "agentic-token", provider: "vic" })).toBeNull();
    });
});
