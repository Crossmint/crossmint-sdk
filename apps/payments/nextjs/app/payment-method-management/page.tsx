"use client";

import { AuthButton } from "../../components/common/AuthButton";
import { ClientProviders } from "./components/ClientProviders";
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
