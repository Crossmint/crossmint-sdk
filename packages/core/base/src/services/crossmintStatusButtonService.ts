import { Locale, onboardingRequestStatusResponse } from "../models/types";
import { t } from "../utils/i18n";

interface CrossmintStatusButtonServiceProps {
    onClick?: (e: any) => void;
    locale: Locale;
}

export function crossmintStatusButtonService({ onClick, locale }: CrossmintStatusButtonServiceProps) {
    const getButtonText = (status: onboardingRequestStatusResponse) => {
        switch (status) {
            case onboardingRequestStatusResponse.INVALID:
                return t("crossmintStatusButtonService.INVALID", locale);
            case onboardingRequestStatusResponse.WAITING_SUBMISSION:
                return t("crossmintStatusButtonService.WAITING_SUBMISSION", locale);
            case onboardingRequestStatusResponse.PENDING:
                return t("crossmintStatusButtonService.PENDING", locale);
            case onboardingRequestStatusResponse.ACCEPTED:
                return t("crossmintStatusButtonService.ACCEPTED", locale);
            case onboardingRequestStatusResponse.REJECTED:
                return t("crossmintStatusButtonService.REJECTED", locale);
        }
    };

    const isButtonDisabled = (status: onboardingRequestStatusResponse) =>
        status !== onboardingRequestStatusResponse.WAITING_SUBMISSION;

    const handleClick = (event: any, status: onboardingRequestStatusResponse, goToOnboarding: () => void) => {
        if (onClick) onClick(event);
        if (status === onboardingRequestStatusResponse.WAITING_SUBMISSION) {
            goToOnboarding();
        }
    };

    return {
        getButtonText,
        isButtonDisabled,
        handleClick,
    };
}
