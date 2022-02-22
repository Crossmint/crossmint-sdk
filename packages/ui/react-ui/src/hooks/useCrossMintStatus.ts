import { useState, useEffect } from "react";
import { validate } from "uuid";
import { PublicKey } from "@solana/web3.js";

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

const validateClientId = (clientId: string): boolean => {
    try {
        const isValid = validate(clientId) || new PublicKey(clientId);
        return !!isValid;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export default function useCrossMintStatus({ clientId }: IProps) {
    const [status, setStatus] = useState<OnboardingRequestStatusResponse>(
        OnboardingRequestStatusResponse.WAITING_SUBMISSION
    );

    async function fetchClientIntegration() {
        if (!clientId || clientId === "" || clientId === "<YOUR_CLIENT_ID>") {
            console.error("You must enter your own Crossmint client ID in <CrossMintButton clientId=XXX>");
            return;
        }

        if (!validateClientId(clientId)) {
            console.error(
                "The clientId passed to is invalid. Make sure to pass the clientId obtained from the crossmint team, with format XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
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
