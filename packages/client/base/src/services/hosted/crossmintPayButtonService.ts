import type { CheckoutProps, Locale, PaymentMethod } from "../../types";
import { t } from "../../utils/i18n";

interface IProps {
    onClick?: (e: any) => void;
    connecting: boolean;
    paymentMethod?: PaymentMethod;
    locale: Locale;
    checkoutProps?: CheckoutProps;
}

export function crossmintPayButtonService({ onClick, connecting, paymentMethod, locale, checkoutProps }: IProps) {
    const getButtonText = (connecting: boolean) => {
        if (connecting) {
            return t("crossmintPayButtonService.CONNECTING", locale);
        }
        if (checkoutProps?.experimental === true && checkoutProps?.paymentMethods?.length != 1) {
            return t("crossmintPayButtonService.BUY", locale);
        }
        switch (paymentMethod) {
            case "ETH":
                return t("crossmintPayButtonService.BUY_WITH_ETH", locale);
            case "SOL":
                return t("crossmintPayButtonService.BUY_WITH_SOL", locale);
            default:
                return t("crossmintPayButtonService.BUY_WITH_CREDIT_CARD", locale);
        }
    };

    const handleClick = (event: any, cb: () => void) => {
        if (onClick) onClick(event);

        if (connecting) return;

        if (!event.defaultPrevented) {
            cb();
        }
    };

    return {
        getButtonText,
        handleClick,
    };
}
