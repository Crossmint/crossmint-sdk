"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthButton } from "../../components/common/AuthButton";
import { ClientProviders } from "../payment-method-management/components/ClientProviders";
import { CrossmintCvcRecollection, useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

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

    if (jwt == null) {
        return <div>Please login to continue</div>;
    }

    if (paymentMethodId == null) {
        return <div>Add ?paymentMethodId=&lt;id&gt; to the URL</div>;
    }

    return (
        <CrossmintCvcRecollection
            jwt={jwt}
            paymentMethodId={paymentMethodId}
            onComplete={() => console.log("cvc:complete")}
            onError={(error) => console.error("cvc:error", error)}
        />
    );
}
