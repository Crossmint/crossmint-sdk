import { backOff } from "exponential-backoff";

import { CrossmintEvent, CrossmintEvents } from "..";
import { getEnvironmentBaseUrl } from "../utils";

export function useCrossmintEvents({ environment }: { environment?: string } = {}) {
    function listenToMintingEvents(
        {
            orderIdentifier,
        }: {
            orderIdentifier: string;
        },
        cb: (event: CrossmintEvent) => any
    ) {
        const emittedEvents: CrossmintEvents[] = [];
        const succeededTransactionIdentifiers: string[] = [];
        const failedTransactionIdentifiers: string[] = [];

        function emitEvent(event: CrossmintEvent) {
            cb(event);
            emittedEvents.push(event.type);
            if (event.type === CrossmintEvents.ORDER_PROCESS_FINISHED) {
                clearInterval(timer);
            }
        }

        function handleDuplicateEvent(event: CrossmintEvent) {
            if (!("transactionIdentifier" in event.payload)) {
                return;
            }

            if (event.type === CrossmintEvents.TRANSACTION_FULFILLMENT_SUCCEEDED) {
                if (succeededTransactionIdentifiers.includes(event.payload.transactionIdentifier)) {
                    return;
                }
                succeededTransactionIdentifiers.push(event.payload.transactionIdentifier);
                emitEvent(event);
            } else if (event.type === CrossmintEvents.TRANSACTION_FULFILLMENT_FAILED) {
                if (failedTransactionIdentifiers.includes(event.payload.transactionIdentifier)) {
                    return;
                }
                failedTransactionIdentifiers.push(event.payload.transactionIdentifier);
                emitEvent(event);
            }
        }

        let isFetching = false;
        const timer = setInterval(async () => {
            if (isFetching) {
                return;
            }

            isFetching = true;
            const events = await fetchOrderStatus({ orderIdentifier });

            for (const event of events) {
                emittedEvents.includes(event.type) ? handleDuplicateEvent(event) : emitEvent(event);
            }
            isFetching = false;
        }, 5000);

        // When history changes, clear the interval
        window.onpopstate = () => {
            isFetching = false;
            clearInterval(timer);
        };

        return {
            cleanup: () => {
                clearInterval(timer);
            },
        };
    }

    async function fetchOrderStatus({ orderIdentifier }: { orderIdentifier: string }): Promise<CrossmintEvent[]> {
        return await backOff(
            async () => {
                const res = await fetch(
                    `${getEnvironmentBaseUrl(environment)}/api/sdk/orders/${orderIdentifier}/status`,
                    {
                        method: "GET",
                        headers: {},
                    }
                );
                const response = await res.json();
                if (response.error) {
                    return [];
                }
                return response;
            },
            {
                startingDelay: 650,
                timeMultiple: 2.5, // 650ms, 1625ms, 4062.5ms, 10156.25ms, 25390.625ms
                numOfAttempts: 5,
            }
        );
    }

    return {
        listenToMintingEvents,
    };
}
