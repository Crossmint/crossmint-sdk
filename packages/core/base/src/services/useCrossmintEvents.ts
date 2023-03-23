import { CheckoutEvents, ListenToMintingEventsProps, ListenerType } from "../models/events";
import { CrossmintCheckoutEvent } from "../models/paymentElement";
import { getEnvironmentBaseUrl } from "../utils";

export function useCrossmintEvents({ environment }: { environment?: string } = {}) {
    function listenToMintingEvents({ orderIdentifier }: ListenToMintingEventsProps, cb: ListenerType) {
        const emittedEvents: CheckoutEvents[] = [];
        const succeededTransactionIdentifiers: string[] = [];
        const failedTransactionIdentifiers: string[] = [];

        const timer = setInterval(async () => {
            const events = await fetchOrderStatus({ orderIdentifier });

            for (const event of events) {
                if (emittedEvents.includes(event.type)) {
                    if (!event.payload.transactionIdentifier) {
                        if (event.type === CheckoutEvents.TRANSACTION_FULFILLMENT_SUCCEEDED) {
                            if (succeededTransactionIdentifiers.includes(event.payload.transactionIdentifier)) {
                                continue;
                            }
                            succeededTransactionIdentifiers.push(event.payload.transactionIdentifier);
                        } else if (event.type === CheckoutEvents.TRANSACTION_FULFILLMENT_FAILED) {
                            if (failedTransactionIdentifiers.includes(event.payload.transactionIdentifier)) {
                                continue;
                            }
                            failedTransactionIdentifiers.push(event.payload.transactionIdentifier);
                        }
                    }
                    continue;
                }
                cb(event);
                emittedEvents.push(event.type);
                if (event.type === CheckoutEvents.ORDER_PROCESS_FINISHED) {
                    clearInterval(timer);
                }
            }
        }, 5000);
    }

    async function fetchOrderStatus({
        orderIdentifier,
    }: {
        orderIdentifier: string;
    }): Promise<CrossmintCheckoutEvent<any>[]> {
        try {
            const res = await fetch(`${getEnvironmentBaseUrl(environment)}/api/sdk/orders/${orderIdentifier}/status`, {
                method: "GET",
                headers: {},
            });
            const response = await res.json();
            if (response.error) {
                return [];
            }
            return response;
        } catch (e) {
            return [];
        }
    }

    return {
        listenToMintingEvents,
    };
}
