import { OnboardingQueryParams, clientNames, customHeaders, onboardingRequestStatusResponse } from "../models/types";
import { getEnvironmentBaseUrl } from "../utils/ui";
import validateUUID from "../utils/validateUUID";

interface CrossmintStatusServiceParams {
    libVersion: string;
    clientId: string;
    setStatus: any;
    environment?: string;
    clientName: clientNames;
}

const validateClientId = (clientId: string): boolean => {
    try {
        return validateUUID(clientId);
    } catch (e) {
        console.error(e);
        return false;
    }
};

export function crossmintStatusService({
    libVersion,
    clientId,
    setStatus,
    environment,
    clientName,
}: CrossmintStatusServiceParams) {
    async function fetchClientIntegration() {
        if (!clientId || clientId === "" || clientId === "<YOUR_COLLECTION_ID>") {
            console.error("You must enter your own Crossmint collection ID in <CrossmintPayButton collectionId=XXX>");
            return;
        }

        if (!validateClientId(clientId)) {
            console.error(
                "The collectionId passed to is invalid. Make sure to pass the collectionId obtained from the crossmint team"
            );
            return;
        }

        const baseUrl = getEnvironmentBaseUrl(environment);

        const res = await fetch(`${baseUrl}/api/crossmint/onboardingRequests/${clientId}/status`, {
            headers: {
                [customHeaders.clientVersion]: libVersion,
                [customHeaders.clientName]: clientName,
            },
        });

        if (res.status === 200) {
            const resData: { clientId: string; status: onboardingRequestStatusResponse } = await res.json();

            setStatus(resData.status);
        } else {
            setStatus(onboardingRequestStatusResponse.INVALID);
        }
    }

    return {
        fetchClientIntegration,
    };
}
