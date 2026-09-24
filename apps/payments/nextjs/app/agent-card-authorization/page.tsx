"use client";

import { useState } from "react";
import { AuthButton } from "../../components/common/AuthButton";
import { ClientProviders } from "../payment-method-management/components/ClientProviders";
import {
    type AgentCardAuthorizationError,
    type AgentCardAuthorizationResult,
    CrossmintAgentCardAuthorization,
} from "@crossmint/client-sdk-react-ui";

// Consumes the SDK the way an integrator would: the buyer picks or adds a card, the SDK
// registers it, creates a bounded order intent and runs rail verification when needed, and
// the page receives only the orderIntentId to hand to Universal Checkout. The component is
// rendered before the auth provider has loaded the session on purpose, since that is how most
// integrations mount it: a missing session surfaces as `missing_jwt` after the grace period.
export default function AgentCardAuthorizationPage() {
    return (
        <ClientProviders>
            <AuthButton />
            <AgentCardAuthorizationWrapper />
        </ClientProviders>
    );
}

function AgentCardAuthorizationWrapper() {
    const [result, setResult] = useState<AgentCardAuthorizationResult | null>(null);
    const [errors, setErrors] = useState<AgentCardAuthorizationError[]>([]);

    if (result != null) {
        return (
            <div>
                Order intent <code>{result.orderIntentId}</code> authorized on {result.paymentMethod.brand} ····
                {result.paymentMethod.last4} via {result.rail.rail}
                {result.rail.provider != null ? ` (${result.rail.provider})` : ""}, {result.amount.available}{" "}
                {result.amount.currency} available until {result.expiresAt}.
            </div>
        );
    }

    return (
        <>
            <CrossmintAgentCardAuthorization
                amount={{ value: "25.00", currency: "USD" }}
                merchant={{ name: "Example Shop", url: "https://shop.example.com", countryCode: "US" }}
                description="Demo purchase placed by a shopping agent"
                displayName="Example Shop"
                onAuthorized={setResult}
                onError={(error) => setErrors((previous) => [...previous, error])}
            />
            {errors.length > 0 ? (
                <ul aria-label="errors">
                    {errors.map((error, index) => (
                        <li key={`${error.code}-${index}`}>
                            <code>{error.code}</code>: {error.message}
                        </li>
                    ))}
                </ul>
            ) : null}
        </>
    );
}
