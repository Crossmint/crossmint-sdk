"use client";

import { AuthButton } from "../../components/common/AuthButton";
import { ClientProviders } from "./components/ClientProviders";
import {
    useCrossmintAuth,
    CrossmintPaymentMethodManagement,
    type CrossmintPaymentMethodManagementRef,
    type PaymentMethodSubmitResult,
} from "@crossmint/client-sdk-react-ui";
import { useRef, useState } from "react";

export default function PaymentMethodManagementPage() {
    return (
        <ClientProviders>
            <AuthButton />
            <PaymentMethodManagementWrapper />
        </ClientProviders>
    );
}

function PaymentMethodManagementWrapper() {
    const { jwt } = useCrossmintAuth();
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<PaymentMethodSubmitResult | null>(null);
    const pmm = useRef<CrossmintPaymentMethodManagementRef>(null);

    async function submitPaymentMethod() {
        setSubmitting(true);
        setResult(null);
        try {
            setResult((await pmm.current?.submit()) ?? null);
        } finally {
            setSubmitting(false);
        }
    }

    if (jwt == null) {
        return <div>Please login to continue</div>;
    }

    return (
        <div style={{ maxWidth: 480 }}>
            <CrossmintPaymentMethodManagement
                ref={pmm}
                jwt={jwt}
                allowedModes={["new", "existing"]}
                onPaymentMethodSelected={(paymentMethod) => console.log("payment-method:selected", paymentMethod)}
            />
            <button
                type="button"
                style={{ marginTop: 16, padding: "12px 20px" }}
                onClick={submitPaymentMethod}
                disabled={submitting}
            >
                {submitting ? "Saving…" : "My own submit button"}
            </button>
            {result != null && <pre style={{ marginTop: 16 }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
    );
}
