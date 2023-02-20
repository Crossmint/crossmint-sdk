import { Locale, onboardingRequestStatusResponse, paymentMethods } from "../models/types";
import { t } from "../utils/i18n";

interface IProps {
    onClick?: (e: any) => void;
    connecting: boolean;
    paymentMethod?: paymentMethods;
    locale: Locale;
}

export function crossmintPayButtonService({ onClick, connecting, paymentMethod, locale }: IProps) {
    const getButtonText = (connecting: boolean) => {
        if (connecting) {
            return t("crossmintPayButtonService.CONNECTING", locale);
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
    const shouldHideButton = ({ hideMintOnInactiveClient, status }: any) =>
        hideMintOnInactiveClient && status !== onboardingRequestStatusResponse.ACCEPTED;

    const handleClick = (event: any, cb: () => void) => {
        if (onClick) onClick(event);

        if (connecting) return;

        if (!event.defaultPrevented) {
            cb();
        }
    };

    return {
        getButtonText,
        shouldHideButton,
        handleClick,
    };
}
