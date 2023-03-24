import { CheckoutEvents, ListenToMintingEventsProps, ListenerType } from "../models/events";
import { CrossmintCheckoutEvent } from "../models/paymentElement";
import { getEnvironmentBaseUrl } from "../utils";

export function useCrossmintEvents({ environment }: { environment?: string } = {}) {
    function listenToMintingEvents({ orderIdentifier }: ListenToMintingEventsProps, cb: ListenerType) {
        const emittedEvents: CheckoutEvents[] = [];
        const succeededTransactionIdentifiers: string[] = [];
        const failedTransactionIdentifiers: string[] = [];

        function emitEvent(event: CrossmintCheckoutEvent<any>) {
            cb(event);
            emittedEvents.push(event.type);
            if (event.type === CheckoutEvents.ORDER_PROCESS_FINISHED) {
                clearInterval(timer);
            }
        }

        function handleDuplicateEvent(event: CrossmintCheckoutEvent<any>) {
            if (!event.payload.transactionIdentifier) {
                return;
            }

            if (event.type === CheckoutEvents.TRANSACTION_FULFILLMENT_SUCCEEDED) {
                if (succeededTransactionIdentifiers.includes(event.payload.transactionIdentifier)) {
                    return;
                }
                succeededTransactionIdentifiers.push(event.payload.transactionIdentifier);
                emitEvent(event);
            } else if (event.type === CheckoutEvents.TRANSACTION_FULFILLMENT_FAILED) {
                if (failedTransactionIdentifiers.includes(event.payload.transactionIdentifier)) {
                    return;
                }
                failedTransactionIdentifiers.push(event.payload.transactionIdentifier);
                emitEvent(event);
            }
        }

        const timer = setInterval(async () => {
            const events = await fetchOrderStatus({ orderIdentifier });

            for (const event of events) {
                emittedEvents.includes(event.type) ? handleDuplicateEvent(event) : emitEvent(event);
            }
        }, 5000);

        // When history changes, clear the interval
        window.onpopstate = () => {
            clearInterval(timer);
        };
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
            console.error("Error fetching order status", e);
            return [];
        }
    }

    return {
        listenToMintingEvents,
    };
}
