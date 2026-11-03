"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { AuthButton } from "../../components/common/AuthButton";
import { ClientProviders } from "../payment-method-management/components/ClientProviders";
import {
    CrossmintCvcRecollection,
    type CrossmintCvcRecollectionRef,
    type CvcRecollectionSubmitResult,
    useCrossmintAuth,
} from "@crossmint/client-sdk-react-ui";

// Consumes the SDK the way an integrator would. Open it as
// /cvc-recollection?paymentMethodId=<id> for a card whose order intent reports
// `encrypted-card.status === "pending_cvc_recollection"`.
export default function CvcRecollectionPage() {
    return (
        <ClientProviders>
            <AuthButton />
            {/* useSearchParams needs a Suspense boundary or `next build` refuses the page. */}
            <Suspense fallback={null}>
                <CvcRecollectionWrapper />
            </Suspense>
        </ClientProviders>
    );
}

function CvcRecollectionWrapper() {
    const { jwt } = useCrossmintAuth();
    const paymentMethodId = useSearchParams()?.get("paymentMethodId") ?? null;
    const [submitting, setSubmitting] = useState(false);
    const [ownButton, setOwnButton] = useState(false);
    const [result, setResult] = useState<CvcRecollectionSubmitResult | null>(null);
    const cvc = useRef<CrossmintCvcRecollectionRef>(null);

    async function submitCvc() {
        setSubmitting(true);
        setResult(null);
        try {
            setResult((await cvc.current?.submit()) ?? null);
        } finally {
            setSubmitting(false);
        }
    }

    if (jwt == null) {
        return <div>Please login to continue</div>;
    }

    if (paymentMethodId == null) {
        return <div>Add ?paymentMethodId=&lt;id&gt; to the URL</div>;
    }

    return (
        <div style={{ maxWidth: 480 }}>
            <label style={{ display: "block", marginBottom: 16 }}>
                <input type="checkbox" checked={ownButton} onChange={(e) => setOwnButton(e.target.checked)} /> Use my
                own submit button
            </label>
            <CrossmintCvcRecollection
                ref={cvc}
                jwt={jwt}
                paymentMethodId={paymentMethodId}
                hideSubmitButton={ownButton}
                onComplete={() => console.log("cvc:complete")}
                onError={(error) => console.error("cvc:error", error)}
            />
            {ownButton && (
                <button
                    type="button"
                    style={{ marginTop: 16, padding: "12px 20px" }}
                    onClick={submitCvc}
                    disabled={submitting}
                >
                    {submitting ? "Confirming…" : "My own confirm button"}
                </button>
            )}
            {result != null && <pre style={{ marginTop: 16 }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
    );
}
