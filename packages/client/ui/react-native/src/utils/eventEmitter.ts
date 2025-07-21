import type { Order } from "@crossmint/client-sdk-base";
import mitt from "mitt";

export type LocalEventEmitterEvents = {
    "order:updated": {
        order?: Order;
        orderClientSecret?: string;
    };
};

// Create a singleton instance for global use
export const localEventEmitter = mitt<LocalEventEmitterEvents>();
