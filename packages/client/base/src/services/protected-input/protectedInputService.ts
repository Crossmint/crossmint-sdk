import type { CrossmintProtectedInputProps } from "@/types/protected-input/CrossmintProtectedInputProps";
import { protectedInputIncomingEvents, protectedInputOutgoingEvents } from "@/types/protected-input/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type ProtectedInputServiceProps = {
    apiClient: Pick<CrossmintApiClient, "buildUrl">;
};

export function createProtectedInputService({ apiClient }: ProtectedInputServiceProps) {
    function getIFrameUrl(props: CrossmintProtectedInputProps) {
        const urlWithPath = apiClient.buildUrl("/sdk/unstable/protected-input");
        const queryParams = new URLSearchParams();

        // Authentication crosses the verified window channel, never the iframe URL.
        appendObjectToQueryParams(queryParams, { field: props.field, appearance: props.appearance });
        if (typeof window !== "undefined") {
            queryParams.set("targetOrigin", window.location.origin);
        }

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    // No explicit targetOrigin: IFrameWindow derives it from the iframe src, so only messages
    // from the Crossmint origin that served the page are accepted.
    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: protectedInputIncomingEvents,
            outgoingEvents: protectedInputOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
