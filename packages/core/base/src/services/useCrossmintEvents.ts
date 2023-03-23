import { CheckoutEvents, ListenToMintingEventsProps, ListenerType } from "../models/events";
import { fetchOrderStatus } from "../utils/payments";

export default function useCrossmintEvents() {
    function listenToMintingEvents({ orderIdentifier }: ListenToMintingEventsProps, cb: ListenerType) {
        const emittedEvents: CheckoutEvents[] = [];

        const timer = setInterval(async () => {
            const event = await fetchOrderStatus({ orderIdentifier });
            if (emittedEvents.includes(event.type)) {
                return;
            }
            cb(event);
            emittedEvents.push(event.type);
            if (event.type === CheckoutEvents.MINTING_COMPLETED) {
                clearInterval(timer);
            }
        }, 5000);
    }

    return {
        listenToMintingEvents,
    };
}
