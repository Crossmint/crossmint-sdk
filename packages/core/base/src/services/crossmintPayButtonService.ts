import {
    onboardingRequestStatusResponse,
    paymentMethodIsEth,
    paymentMethodIsSol,
    paymentMethods,
} from "../models/types";

interface IProps {
    onClick?: (e: any) => void;
    connecting: boolean;
    paymentMethod?: paymentMethods;
}

export function crossmintPayButtonService({ onClick, connecting, paymentMethod }: IProps) {
    const checkProps = ({ collectionTitle, collectionDescription, collectionPhoto }: any) => {
        let _collectionTitle = collectionTitle;
        let _collectionDescription = collectionDescription;
        let _collectionPhoto = collectionPhoto;

        if (collectionTitle === "<TITLE_FOR_YOUR_COLLECTION>") {
            console.warn("No collection title specified. Please add a collection title to your <CrossmintPayButton />");
            _collectionTitle = "";
        }
        if (collectionDescription === "<DESCRIPTION_OF_YOUR_COLLECTION>") {
            console.warn(
                "No collection description specified. Please add a collection description to your <CrossmintPayButton />"
            );
            _collectionDescription = "";
        }
        if (collectionPhoto === "<OPT_URL_TO_PHOTO_COVER>") {
            console.warn("No collection photo specified. Please add a collection photo to your <CrossmintPayButton />");
            _collectionPhoto = "";
        }
        return [_collectionTitle, _collectionDescription, _collectionPhoto];
    };

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
        checkProps,
        getButtonText,
        shouldHideButton,
        handleClick,
    };
}
