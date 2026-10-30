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
    const [ownButton, setOwnButton] = useState(false);
    const [collectBillingAddress, setCollectBillingAddress] = useState(false);
    const [billingLine2, setBillingLine2] = useState<"optional" | "required" | "hidden">("optional");
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
            <label style={{ display: "block", marginBottom: 16 }}>
                <input type="checkbox" checked={ownButton} onChange={(e) => setOwnButton(e.target.checked)} /> Use my
                own submit button
            </label>
            <label style={{ display: "block", marginBottom: 16 }}>
                <input
                    type="checkbox"
                    checked={collectBillingAddress}
                    onChange={(e) => setCollectBillingAddress(e.target.checked)}
                />{" "}
                Collect billing address
            </label>
            {collectBillingAddress && (
                <label style={{ display: "block", marginBottom: 16 }}>
                    Address line 2:{" "}
                    <select
                        value={billingLine2}
                        onChange={(e) => setBillingLine2(e.target.value as typeof billingLine2)}
                    >
                        <option value="optional">optional</option>
                        <option value="required">required</option>
                        <option value="hidden">hidden</option>
                    </select>
                </label>
            )}
            <CrossmintPaymentMethodManagement
                ref={pmm}
                jwt={jwt}
                allowedModes={["new", "existing"]}
                hideSubmitButton={ownButton}
                fields={collectBillingAddress ? { billingDetails: { address: { line2: billingLine2 } } } : undefined}
                onPaymentMethodSelected={(paymentMethod) => console.log("payment-method:selected", paymentMethod)}
            />
            {ownButton && (
                <button
                    type="button"
                    style={{ marginTop: 16, padding: "12px 20px" }}
                    onClick={submitPaymentMethod}
                    disabled={submitting}
                >
                    {submitting ? "Saving…" : "My own submit button"}
                </button>
            )}
            {result != null && <pre style={{ marginTop: 16 }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
    );
}
