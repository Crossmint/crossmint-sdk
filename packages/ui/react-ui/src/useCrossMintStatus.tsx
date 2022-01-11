import { createContext, useContext } from "react";

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

export const CrossMintStatusContext = createContext<CrossMintStatusContextState>({} as CrossMintStatusContextState);

export function useCrossMintStatus(): CrossMintStatusContextState {
    return useContext(CrossMintStatusContext);
}
