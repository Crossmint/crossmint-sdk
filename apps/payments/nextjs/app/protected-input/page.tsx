"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthButton } from "../../components/common/AuthButton";
import { ClientProviders } from "../payment-method-management/components/ClientProviders";
import { CrossmintProtectedInput, type ProtectedInputCreated, useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

// Consumes the SDK the way an integrator would. Open it as
// /protected-input?merchantUrl=https://shop.example.com/login to collect the password of the
// buyer's account on that merchant. Only the returned protectedInputId is shown; the page
// never sees the password.
export default function ProtectedInputPage() {
    return (
        <ClientProviders>
            <AuthButton />
            {/* useSearchParams needs a Suspense boundary or `next build` refuses the page. */}
            <Suspense fallback={null}>
                <ProtectedInputWrapper />
            </Suspense>
        </ClientProviders>
    );
}

function ProtectedInputWrapper() {
    const { jwt } = useCrossmintAuth();
    const merchantUrl = useSearchParams()?.get("merchantUrl") ?? null;
    const [created, setCreated] = useState<ProtectedInputCreated | null>(null);

    if (jwt == null) {
        return <div>Please login to continue</div>;
    }

    const merchantHost = hostnameOf(merchantUrl);
    if (merchantUrl == null || merchantHost == null) {
        return <div>Add ?merchantUrl=&lt;sign-in page URL&gt; (an absolute http(s) URL) to the URL</div>;
    }

    if (created != null) {
        return (
            <div>
                Protected input <code>{created.protectedInputId}</code> registered for {created.merchant.domain}, valid
                until {created.expiresAt}.
            </div>
        );
    }

    return (
        <CrossmintProtectedInput
            jwt={jwt}
            merchantUrl={merchantUrl}
            label={merchantHost}
            onCreated={setCreated}
            onError={(error) => console.error("protected-input:error", error)}
        />
    );
}

// The query string is untrusted; a malformed value must not crash the page.
function hostnameOf(url: string | null): string | null {
    if (url == null) {
        return null;
    }
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
}
