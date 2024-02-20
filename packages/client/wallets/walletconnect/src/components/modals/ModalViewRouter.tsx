import { useWalletConnectRequests } from "../../hooks/useWalletConnectRequests";
import { useWalletConnectSessions } from "../../hooks/useWalletConnectSessions";
import SessionProposalViewRouter from "./SessionProposal/SessionProposalViewRouter";
import SessionRequestViewRouter from "./SessionRequest/SessionRequestViewRouter";

export default function ModalViewRouter() {
    const { sessionProposals, sessions } = useWalletConnectSessions();
    const { requests } = useWalletConnectRequests();

    if (sessionProposals.length > 0) {
        return <SessionProposalViewRouter proposal={sessionProposals[0]} />;
    }

    if (sessions.length === 0) {
        return null;
    }

    if (requests.length > 0) {
        return <SessionRequestViewRouter request={requests[0]} />;
    }

    return null;
}
