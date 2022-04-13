import { onboardingRequestStatusResponse } from "../models/types";

interface CrossmintStatusButtonServiceProps {
    onClick?: (e: any) => void;
}

export function crossmintStatusButtonService({ onClick }: CrossmintStatusButtonServiceProps) {
    const getButtonText = (status: onboardingRequestStatusResponse) => {
        switch (status) {
            case onboardingRequestStatusResponse.INVALID:
                return "Invalid clientId";
            case onboardingRequestStatusResponse.WAITING_SUBMISSION:
                return "Click here to setup Crossmint";
            case onboardingRequestStatusResponse.PENDING:
                return "Your application is under review";
            case onboardingRequestStatusResponse.ACCEPTED:
                return "You're good to go!";
            case onboardingRequestStatusResponse.REJECTED:
                return "Your application was rejected";
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
