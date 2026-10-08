"use client";

import { useRef, useState } from "react";
import {
    CrossmintProtectedInput,
    type CrossmintProtectedInputRef,
    type ProtectedInputCollectionResult,
    useCrossmintAuth,
} from "@crossmint/client-sdk-react-ui";
import { AuthButton } from "../../components/common/AuthButton";
import { ClientProviders } from "../payment-method-management/components/ClientProviders";

// This demo supplies a JWT through its existing login; the component also accepts external auth.
export default function ProtectedInputPage() {
    return (
        <ClientProviders>
            <AuthButton />
            <ProtectedField />
        </ClientProviders>
    );
}

function ProtectedField() {
    const { jwt } = useCrossmintAuth();
    const ref = useRef<CrossmintProtectedInputRef>(null);
    const [result, setResult] = useState<ProtectedInputCollectionResult | null>(null);
    const [busy, setBusy] = useState(false);
    if (jwt == null) {
        return <p>Please login to continue</p>;
    }

    async function collect() {
        if (ref.current == null || busy) {
            return;
        }
        setBusy(true);
        try {
            setResult(await ref.current.collect());
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <label>Verification code</label>
            <CrossmintProtectedInput
                ref={ref}
                jwt={jwt}
                disabled={busy}
                invalid={result?.status === "invalid"}
                field={{
                    key: "code",
                    label: "Verification code",
                    required: true,
                    handling: "protected",
                    input: { kind: "text", autoComplete: "one-time-code", inputMode: "numeric" },
                }}
            />
            <button type="button" disabled={busy} onClick={collect}>
                Continue
            </button>
            {result?.status === "collected" ? (
                <p>Protected reference: {result.input.protectedInputId}</p>
            ) : (
                result != null && <p role="alert">{result.message}</p>
            )}
        </div>
    );
}
