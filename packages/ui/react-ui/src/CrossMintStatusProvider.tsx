import React, { FC, ReactNode, useEffect, useState } from "react";
import { OnboardingRequestStatusResponse, CrossMintStatusContext } from "./useCrossMintStatus";

export interface CrossMintStatusProviderProps {
    clientId: string;
    auctionId?: string;
    hideMintOnInactiveClient: boolean;
    children: ReactNode;
}

export const CrossMintStatusProvider: FC<CrossMintStatusProviderProps> = ({
    clientId,
    auctionId,
    hideMintOnInactiveClient,
    children,
}) => {
    const [status, setStatus] = useState<OnboardingRequestStatusResponse>(
        OnboardingRequestStatusResponse.WAITING_SUBMISSION
    );

    async function fetchClientIntegration() {
        if (!clientId || clientId === "" || clientId === "<YOUR_CLIENT_ID>") {
            console.warn("You must enter your own CrossMint client ID in <CrossMintProvider clientId=XXX>");
            return;
        }
        
        const res = await fetch(`https://www.crossmint.io/api/crossmint/onboardingRequests/${clientId}/status`);

        if (res.status === 200) {
            const resData: { clientId: string; status: OnboardingRequestStatusResponse } = await res.json();

            console.log("resData", resData);
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

    return (
        <CrossMintStatusContext.Provider
            value={{
                status,
                clientId,
                auctionId,
                hideMintOnInactiveClient,
            }}
        >
            {children}
        </CrossMintStatusContext.Provider>
    );
};
