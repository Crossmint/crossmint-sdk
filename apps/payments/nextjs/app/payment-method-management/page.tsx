"use client";

import { ClientProviders } from "./components/ClientProviders";
import { AuthButton } from "./components/AuthButton";
import { useCrossmintAuth, CrossmintPaymentMethodManagement } from "@crossmint/client-sdk-react-ui";

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

    if (jwt == null) {
        return <div>Please login to continue</div>;
    }

    return <CrossmintPaymentMethodManagement jwt={jwt} />;
}
