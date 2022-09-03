import { onboardingRequestStatusResponse, paymentMethods } from "../models/types";

interface IProps {
    onClick?: (e: any) => void;
    connecting: boolean;
    paymentMethod?: paymentMethods;
}

export function crossmintPayButtonService({ onClick, connecting, paymentMethod }: IProps) {
    const getButtonText = (connecting: boolean) => {
        if (connecting) {
            return "Connecting...";
        }
        switch (paymentMethod) {
            case "ETH":
                return "Buy with ETH";
            case "SOL":
                return "Buy with SOL";
            default:
                return "Buy with credit card";
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
