import type { z } from "zod";

import type { PaymentMethodManagementAppearance } from "../payment-method-management/CrossmintPaymentMethodManagementProps";
import type { cvcRecollectionIncomingEvents } from "./events/incoming";

/** `retriable: false` means the flow is dead and the user cannot finish it. */
export type CvcRecollectionError = z.infer<(typeof cvcRecollectionIncomingEvents)["cvc:error"]>;

export interface CrossmintCvcRecollectionProps {
    /** The user's Crossmint auth token, the same one `CrossmintPaymentMethodManagement` takes. */
    jwt: string;
    /** The saved card whose vaulted CVC has to be refreshed. */
    paymentMethodId: string;
    appearance?: PaymentMethodManagementAppearance;
    /** Called once the vault holds a fresh CVC. Receives no CVC and no token payload. */
    onComplete?: () => void;
    onError?: (error: CvcRecollectionError) => void;
}
