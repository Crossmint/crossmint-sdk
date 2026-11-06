import { createContext, useContext } from "react";

export type TrustCheckoutWindow = (checkoutWindow: Window) => () => void;

export const CheckoutWindowsContext = createContext<TrustCheckoutWindow | undefined>(undefined);

export function useTrustCheckoutWindow() {
    return useContext(CheckoutWindowsContext);
}
