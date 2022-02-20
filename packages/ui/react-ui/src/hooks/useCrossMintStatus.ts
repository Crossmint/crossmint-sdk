import { useState, useEffect } from "react";

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
}

const isValidUUID = (uuid: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);

export default function useCrossMintStatus({ clientId }: IProps) {
    const [status, setStatus] = useState<OnboardingRequestStatusResponse>(
        OnboardingRequestStatusResponse.WAITING_SUBMISSION
    );

    async function fetchClientIntegration() {
        if (!clientId || clientId === "" || clientId === "<YOUR_CLIENT_ID>") {
            console.error("You must enter your own Crossmint client ID in <CrossMintButton clientId=XXX>");
            return;
        }

        if (!isValidUUID(clientId)) {
            console.error(
                "Entered `clientId` is not valid. It must be a valid Crossmint client ID. It will have the following format: `00000000-0000-0000-0000-00000000`."
            );
            return;
        }

        const res = await fetch(`https://www.crossmint.io/api/crossmint/onboardingRequests/${clientId}/status`);

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
