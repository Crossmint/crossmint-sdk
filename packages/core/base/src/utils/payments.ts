import { CheckoutEvents } from "../models/events";
import { CrossmintCheckoutEvent } from "../models/paymentElement";
import { getEnvironmentBaseUrl } from "../utils";

export async function fetchOrderStatus({
    orderIdentifier,
}: {
    orderIdentifier: string;
}): Promise<CrossmintCheckoutEvent<any>> {
    // TODO: Add error handling
    const res = await fetch(`${getEnvironmentBaseUrl()}/api/orders/${orderIdentifier}/status`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    return res.json();
}
