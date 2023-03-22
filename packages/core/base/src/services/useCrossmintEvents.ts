import { CheckoutEvents, ListenToMintingEventsProps, ListenerType } from "../models/events";
import { fetchOrderStatus } from "../utils/payments";

export default function useCrossmintEvents() {
    function listenToMintingEvents({ orderIdentifier }: ListenToMintingEventsProps, cb: ListenerType) {
        const emittedEvents: CheckoutEvents[] = [];

        const timer = setInterval(async () => {
            const status = await fetchOrderStatus({ orderIdentifier });
            switch (status) {
                case CheckoutEvents.MINTING_STARTED:
                    if (!emittedEvents.includes(CheckoutEvents.MINTING_STARTED)) {
                        cb({ type: CheckoutEvents.MINTING_STARTED, payload: {} });
                        emittedEvents.push(CheckoutEvents.MINTING_STARTED);
                    }
                    break;
                case CheckoutEvents.MINTING_COMPLETED:
                    if (!emittedEvents.includes(CheckoutEvents.MINTING_COMPLETED)) {
                        cb({ type: CheckoutEvents.MINTING_COMPLETED, payload: {} });
                        emittedEvents.push(CheckoutEvents.MINTING_COMPLETED);
                    }
                    clearInterval(timer);
                    break;
                case CheckoutEvents.MINTING_FAILED:
                    if (!emittedEvents.includes(CheckoutEvents.MINTING_FAILED)) {
                        cb({ type: CheckoutEvents.MINTING_FAILED, payload: {} });
                        emittedEvents.push(CheckoutEvents.MINTING_FAILED);
                    }
                    clearInterval(timer);
                    break;
                default:
                    break;
            }
        }, 5000);
    }

    return {
        listenToMintingEvents,
    };
}
