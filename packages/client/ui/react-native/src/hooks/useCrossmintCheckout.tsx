import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { Order } from "@crossmint/client-sdk-base";
import { localEventEmitter, type LocalEventEmitterEvents } from "@/utils/eventEmitter";

export interface CrossmintCheckoutContext {
    order?: Order;
    orderClientSecret?: string;
}

const CrossmintCheckoutContext = createContext<CrossmintCheckoutContext | undefined>(undefined);

export function CrossmintCheckoutProvider({ children }: { children: ReactNode }) {
    const [order, setOrder] = useState<Order | undefined>(undefined);
    const [orderClientSecret, setOrderClientSecret] = useState<string | undefined>(undefined);

    useEffect(() => {
        const handleOrderUpdated = (data: LocalEventEmitterEvents["order:updated"]) => {
            setOrder(data.order);
            setOrderClientSecret(data.orderClientSecret);
        };

        localEventEmitter.on("order:updated", handleOrderUpdated);

        return () => {
            localEventEmitter.off("order:updated", handleOrderUpdated);
        };
    }, []);

    return (
        <CrossmintCheckoutContext.Provider value={{ order, orderClientSecret }}>
            {children}
        </CrossmintCheckoutContext.Provider>
    );
}

export function useCrossmintCheckout() {
    const context = useContext(CrossmintCheckoutContext);
    if (!context) {
        throw new Error("useCrossmintCheckout must be used within a CrossmintCheckoutProvider");
    }
    return context;
}
