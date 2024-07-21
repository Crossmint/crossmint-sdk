import { Order } from "@/types/checkout/headless/Order";
import { createContext, useContext, useState } from "react";

export interface CrossmintCheckoutContext {
    order?: Order;
    orderClientSecret?: string;
}

const CrossmintCheckoutContext = createContext<CrossmintCheckoutContext | null>(null);

export function CrossmintCheckoutProvider({ children }: { children: React.ReactNode }) {
    const [order, setOrder] = useState<Order | undefined>(undefined);
    const [orderClientSecret, setOrderClientSecret] = useState<string | undefined>(undefined);

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
