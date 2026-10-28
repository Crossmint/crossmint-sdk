"use client";

// Local-only PMM harness for testing fields.billingDetails.address against a local
// crossbit-main (e.g. devin-tools crossmint-stack provisioning). Not committed
// upstream usage: pass the provisioned ck_development_ key and a custom-issuer
// JWT through the URL: /pmm-local?key=ck_development_...&jwt=eyJ...
import {
    CrossmintPaymentMethodManagement,
    CrossmintProvider,
    type UserPaymentMethodOutput,
} from "@crossmint/client-sdk-react-ui";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function PmmLocal() {
    const params = useSearchParams();
    const apiKey = params.get("key") ?? "";
    const jwt = params.get("jwt") ?? "";
    const [collectBillingAddress, setCollectBillingAddress] = useState(params.get("collect") === "1");
    const [selected, setSelected] = useState<UserPaymentMethodOutput | null>(null);

    if (apiKey === "" || jwt === "") {
        return <div>Pass ?key=ck_development_...&jwt=... in the URL</div>;
    }

    return (
        <CrossmintProvider apiKey={apiKey}>
            <div style={{ maxWidth: 480 }}>
                <label style={{ display: "block", marginBottom: 16 }}>
                    <input
                        type="checkbox"
                        checked={collectBillingAddress}
                        onChange={(e) => setCollectBillingAddress(e.target.checked)}
                    />{" "}
                    Collect billing address
                </label>
                <CrossmintPaymentMethodManagement
                    jwt={jwt}
                    allowedModes={["new", "existing"]}
                    fields={collectBillingAddress ? { billingDetails: { address: true } } : undefined}
                    onPaymentMethodSelected={(paymentMethod) => {
                        console.log("payment-method:selected", paymentMethod);
                        setSelected(paymentMethod);
                    }}
                />
                {selected != null && (
                    <pre data-testid="selected-method" style={{ marginTop: 16, fontSize: 12, overflow: "auto" }}>
                        {JSON.stringify(selected, null, 2)}
                    </pre>
                )}
            </div>
        </CrossmintProvider>
    );
}

export default function PmmLocalPage() {
    return (
        <Suspense>
            <PmmLocal />
        </Suspense>
    );
}
