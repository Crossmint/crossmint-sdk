import { CrossmintPaymentMethodManagementIFrame } from "./CrossmintPaymentMethodManagementIFrame";
import type { CrossmintPaymentMethodManagementProps } from "@crossmint/client-sdk-base";

export function CrossmintPaymentMethodManagement(props: CrossmintPaymentMethodManagementProps) {
    return <CrossmintPaymentMethodManagementIFrame {...props} />;
}
