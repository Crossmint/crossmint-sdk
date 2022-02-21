import { useState, useEffect } from "react";
import { LIB_VERSION } from "../version";
import { clientNames, baseUrls, customHeaders } from "../../../types";

export enum OnboardingRequestStatusResponse {
    WAITING_SUBMISSION = "waiting-submission",
    PENDING = "pending",
    REJECTED = "rejected",
    ACCEPTED = "accepted",
    INVALID = "invalid",
}

export interface CrossMintStatusContextState {
    status: OnboardingRequestStatusResponse;
    clientId: string;
    auctionId?: string;
    hideMintOnInactiveClient: boolean;
}

interface IProps {
    clientId: string;
    development: boolean;
}

export default function useCrossMintStatus({ clientId, development }: IProps) {
    const [status, setStatus] = useState<OnboardingRequestStatusResponse>(
        OnboardingRequestStatusResponse.WAITING_SUBMISSION
    );

    async function fetchClientIntegration() {
        if (!clientId || clientId === "" || clientId === "<YOUR_CLIENT_ID>") {
            console.warn("You must enter your own CrossMint client ID in <CrossMintProvider clientId=XXX>");
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
            const resData: { clientId: string; status: OnboardingRequestStatusResponse } = await res.json();

            setStatus(resData.status);
        } else {
            if (status !== OnboardingRequestStatusResponse.INVALID) {
                setStatus(OnboardingRequestStatusResponse.INVALID);
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
