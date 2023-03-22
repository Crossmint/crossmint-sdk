import { CheckoutEvents } from "../models/events";
import { getEnvironmentBaseUrl } from "../utils";

export async function fetchOrderStatus({ orderIdentifier }: { orderIdentifier: string }): Promise<CheckoutEvents> {
    // TODO: Add error handling
    const res = await fetch(`${getEnvironmentBaseUrl()}/api/orders/${orderIdentifier}/status`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    return res.json();
}
