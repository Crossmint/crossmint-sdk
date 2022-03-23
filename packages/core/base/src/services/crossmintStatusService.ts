import {
    clientNames,
    baseUrls,
    customHeaders,
    onboardingRequestStatusResponse,
    OnboardingQueryParams,
} from "../models/types";
import { validate } from "uuid";

interface CrossmintStatusServiceParams {
    libVersion: string;
    clientId: string;
    platformId?: string;
    auctionId?: string;
    mintConfig: any;
    setStatus: any;
}

const validateClientId = (clientId: string): boolean => {
    try {
        const isValid = validate(clientId);
        return !!isValid;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export function crossmintStatusService({
    libVersion,
    clientId,
    platformId,
    auctionId,
    mintConfig,
    setStatus,
}: CrossmintStatusServiceParams) {
    async function fetchClientIntegration() {
        if (!clientId || clientId === "" || clientId === "<YOUR_CLIENT_ID>") {
            console.error("You must enter your own Crossmint client ID in <CrossmintPayButton clientId=XXX>");
            return;
        }

        if (!validateClientId(clientId)) {
            console.error(
                "The clientId passed to is invalid. Make sure to pass the clientId obtained from the crossmint team, with format XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
            );
            return;
        }

        const baseUrl = baseUrls.prod;

        const res = await fetch(`${baseUrl}/api/crossmint/onboardingRequests/${clientId}/status`, {
            headers: {
                [customHeaders.clientVersion]: libVersion,
                [customHeaders.clientName]: clientNames.reactUi,
            },
        });

        if (res.status === 200) {
            const resData: { clientId: string; status: onboardingRequestStatusResponse } = await res.json();

            setStatus(resData.status);
        } else {
            setStatus(onboardingRequestStatusResponse.INVALID);
        }
    }

    const goToOnboarding = () => {
        const baseUrl = development ? baseUrls.dev : baseUrls.prod;
        window.open(`${baseUrl}/developers/onboarding?${formatOnboardingQueryParams()}`, "_blank");
    };

    const formatOnboardingQueryParams = () => {
        const onboardingQueryParams: OnboardingQueryParams = {
            clientId: clientId,
        };

        if (platformId) onboardingQueryParams.platformId = platformId;
        if (auctionId) onboardingQueryParams.auctionId = auctionId;
        if (mintConfig) onboardingQueryParams.mintConfig = JSON.stringify(mintConfig);

        return new URLSearchParams(onboardingQueryParams).toString();
    };

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

    return {
        fetchClientIntegration,
        goToOnboarding,
        getButtonText,
        isButtonDisabled,
    };
}
