import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { embeddedCheckoutV3IncomingEvents, type Order } from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import { CheckoutWindowsContext, type TrustCheckoutWindow } from "./useTrustCheckoutWindow";

export interface CrossmintCheckoutContext {
    order?: Order;
    orderClientSecret?: string;
}

const CrossmintCheckoutContext = createContext<CrossmintCheckoutContext | undefined>(undefined);

export function CrossmintCheckoutProvider({ children }: { children: ReactNode }) {
    const [order, setOrder] = useState<Order | undefined>(undefined);
    const [orderClientSecret, setOrderClientSecret] = useState<string | undefined>(undefined);
    const checkoutWindows = useRef(new Set<Window>());

    const { crossmint } = useCrossmint();
    const checkoutOrigin = new URL(createCrossmintApiClient(crossmint, { usageOrigin: "client" }).baseUrl).origin;

    const trustCheckoutWindow = useCallback<TrustCheckoutWindow>((checkoutWindow) => {
        checkoutWindows.current.add(checkoutWindow);
        return () => {
            checkoutWindows.current.delete(checkoutWindow);
        };
    }, []);

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            if (event.origin !== checkoutOrigin) {
                return;
            }
            if (event.source == null || !checkoutWindows.current.has(event.source as Window)) {
                return;
            }
            if (event.data?.event !== "order:updated") {
                return;
            }
            const parsed = embeddedCheckoutV3IncomingEvents["order:updated"].safeParse(event.data.data);
            if (!parsed.success) {
                return;
            }
            setOrder(parsed.data.order);
            setOrderClientSecret(parsed.data.orderClientSecret);
        };
        window.addEventListener("message", listener);
        return () => {
            window.removeEventListener("message", listener);
        };
    }, [checkoutOrigin]);

    return (
        <CheckoutWindowsContext.Provider value={trustCheckoutWindow}>
            <CrossmintCheckoutContext.Provider value={{ order, orderClientSecret }}>
                {children}
            </CrossmintCheckoutContext.Provider>
        </CheckoutWindowsContext.Provider>
    );
}

export function useCrossmintCheckout() {
    const context = useContext(CrossmintCheckoutContext);
    if (!context) {
        throw new Error("useCrossmintCheckout must be used within a CrossmintCheckoutProvider");
    }
    return context;
}
