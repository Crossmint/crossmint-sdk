import { clientNames, baseUrls, customHeaders, onboardingRequestStatusResponse } from "@crossmint/client-sdk-base";
import { useState, useEffect } from "react";
import { validate } from "uuid";
import { LIB_VERSION } from "../version";

export interface CrossMintStatusContextState {
    status: onboardingRequestStatusResponse;
    clientId: string;
    auctionId?: string;
    hideMintOnInactiveClient: boolean;
}

interface IProps {
    clientId: string;
    development: boolean;
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

export default function useCrossMintStatus({ clientId, development }: IProps) {
    const [status, setStatus] = useState<onboardingRequestStatusResponse>(
        onboardingRequestStatusResponse.WAITING_SUBMISSION
    );

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

        const baseUrl = development ? baseUrls.dev : baseUrls.prod;

        const res = await fetch(`${baseUrl}/api/crossmint/onboardingRequests/${clientId}/status`, {
            headers: {
                [customHeaders.clientVersion]: LIB_VERSION,
                [customHeaders.clientName]: clientNames.reactUi,
            },
        });

        if (res.status === 200) {
            const resData: { clientId: string; status: onboardingRequestStatusResponse } = await res.json();

            setStatus(resData.status);
        } else {
            if (status !== onboardingRequestStatusResponse.INVALID) {
                setStatus(onboardingRequestStatusResponse.INVALID);
            }
        }
    }

    useEffect(() => {
        fetchClientIntegration();

        const interval = setInterval(() => {
            fetchClientIntegration();
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return status;
}
