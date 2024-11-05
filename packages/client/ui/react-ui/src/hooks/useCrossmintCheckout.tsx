import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { embeddedCheckoutV3IncomingEvents, Order } from "@crossmint/client-sdk-base";
import type { z } from "zod";
import { useCrossmint } from "./useCrossmint";
import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";

export interface CrossmintCheckoutContext {
    order?: Order;
    orderClientSecret?: string;
}

const CrossmintCheckoutContext = createContext<CrossmintCheckoutContext | undefined>(undefined);

export function CrossmintCheckoutProvider({ children }: { children: ReactNode }) {
    const [order, setOrder] = useState<Order | undefined>(undefined);
    const [orderClientSecret, setOrderClientSecret] = useState<string | undefined>(undefined);

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, {
        usageOrigin: "client",
    });

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            if (event.origin !== new URL(apiClient.baseUrl).origin) {
                return;
            }
            if (event.data.event !== "order:updated") {
                return;
            }
            const { order, orderClientSecret } = event.data.data as z.infer<
                (typeof embeddedCheckoutV3IncomingEvents)["order:updated"]
            >;
            setOrder(order);
            setOrderClientSecret(orderClientSecret);
        };
        window.addEventListener("message", listener);
        return () => {
            window.removeEventListener("message", listener);
        };
    }, [order]);

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
